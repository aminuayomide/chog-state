// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// Chog State: a permanent life story for every Chog.
/// Only the keeper (current NFT owner) can run experiments. The contract rolls every outcome.
/// No text is stored on-chain: history entries carry a noteId that maps to pre-written text off-chain.
contract ChogStateRegistry is Ownable {
    // ---------- Types ----------
    struct Experiment {
        bool exists;
        uint16 failBps;       // base fail chance, 10000 = 100%
        uint8 failScar;       // scar id (1..8) added on failure
        uint8 minStanding;    // standing needed to run it
        uint8 failMin;
        uint8 failMax;        // weirdness gain range on failure
        uint8 winMin;
        uint8 winMax;         // weirdness gain range on success
        bool oncePerToken;    // Origin: always fails, once per token
    }

    struct State {
        uint32 weirdness;
        uint8 standing;       // 0 Blank, 1 Known, 2 Marked, 3 Legendary
        uint8 failStreak;
        uint16 runCount;
        uint16 successCount;
        uint16 failCount;
        bool originDone;
        uint8 lastExperiment;
        uint8 combosFound;    // bitmask, bit i = combo id i+1
        uint8 runsToday;
        uint32 runsDay;
        uint64 lastActive;
        uint16 milestones;    // bitmask of milestone ids
    }

    struct Entry {
        uint8 kind;           // 0 fail, 1 success, 2 milestone, 3 changed hands, 4 combo
        uint8 experimentId;
        uint8 scarId;
        uint8 risk;
        uint16 noteId;        // fail/success: exp*100 (+50 for success) + variant; milestone: 1000+id; combo: 2000+id; hands: 3000
        uint32 weirdnessAfter;
        uint64 timestamp;
    }

    struct Combo {
        bool exists;
        uint8 first;
        uint8 second;
        uint16 bonus;
    }

    struct Modifier {
        uint8 experimentId;   // 0 = applies to every experiment (except Origin)
        int16 failDeltaBps;
        uint16 weirdnessMulBps;
    }

    struct Result {
        bool success;
        uint8 scarId;
        uint16 noteId;
        uint32 weirdnessAfter;
        bytes32 seed;
    }

    // ---------- Constants ----------
    uint8 public constant KIND_FAIL = 0;
    uint8 public constant KIND_SUCCESS = 1;
    uint8 public constant KIND_MILESTONE = 2;
    uint8 public constant KIND_HANDS = 3;
    uint8 public constant KIND_COMBO = 4;

    uint8 public constant M_FIRST_SCAR = 0;
    uint8 public constant M_FIRST_BREAKTHROUGH = 1;
    uint8 public constant M_TEN_FAILURES = 2;
    uint8 public constant M_TWENTY_FIVE_RUNS = 3;
    uint8 public constant M_STREAK_3 = 4;
    uint8 public constant M_STREAK_6 = 5;
    uint8 public constant M_STREAK_9 = 6;
    // 7 Known, 8 Marked, 9 Legendary (6 + standing)

    // ---------- Immutable wiring ----------
    IERC721 public immutable nft;
    IERC20 public immutable chogToken;
    address public immutable burnAddress;

    // ---------- Config (owner-set, then lockable) ----------
    mapping(uint8 => Experiment) public experiments;
    uint32[3] public standingThresholds;
    uint8 public dailyFreeRuns = 8;
    uint256 public extraRunFee = 10 ether;
    Combo[8] public combos;
    Modifier[] internal _modifiers;
    bool public configLocked;

    // ---------- Per-token state ----------
    mapping(uint256 => State) internal _state;
    mapping(uint256 => address) public lastOwner;
    mapping(uint256 => uint16[9]) internal _scars;   // index = scar id (1..8)
    mapping(uint256 => Entry[]) internal _history;

    // ---------- Events ----------
    event ExperimentRun(
        uint256 indexed tokenId,
        uint8 experimentId,
        uint8 risk,
        bool success,
        uint8 scarId,
        uint16 noteId,
        bytes32 seed,         // roll = uint256(seed) % 10000
        uint32 weirdnessAfter
    );
    event MilestoneReached(uint256 indexed tokenId, uint8 milestoneId);
    event ComboFound(uint256 indexed tokenId, uint8 comboId);
    event ChangedHands(uint256 indexed tokenId, address indexed from, address indexed to);

    constructor(address nft_, address chogToken_, address burnAddress_) Ownable(msg.sender) {
        require(nft_ != address(0) && chogToken_ != address(0) && burnAddress_ != address(0), "Zero address");
        nft = IERC721(nft_);
        chogToken = IERC20(chogToken_);
        burnAddress = burnAddress_;
        standingThresholds = [uint32(20), uint32(70), uint32(180)];
    }

    // =====================================================
    //                       THE GAME
    // =====================================================

    /// risk: 0 Careful, 1 Normal, 2 Reckless (ignored for Origin)
    function runExperiment(uint256 tokenId, uint8 experimentId, uint8 risk) external {
        require(risk <= 2, "Bad risk");
        Experiment memory ex = experiments[experimentId];
        require(ex.exists, "No such experiment");

        _requireKeeper(tokenId);

        State storage s = _state[tokenId];
        require(s.standing >= ex.minStanding, "Locked");
        if (ex.oncePerToken) {
            require(!s.originDone, "Origin already done");
            s.originDone = true;
        }
        _chargeDailyRun(s);

        uint256 n = uint256(
            keccak256(abi.encode(block.prevrandao, block.timestamp, msg.sender, tokenId, s.runCount, address(this)))
        );
        bool success = _isSuccess(ex, experimentId, risk, n);

        Result memory r = _resolve(tokenId, s, experimentId, risk, ex, success, n);
        emit ExperimentRun(tokenId, experimentId, risk, r.success, r.scarId, r.noteId, r.seed, r.weirdnessAfter);
        _afterRun(tokenId, s, experimentId, success);
    }

    /// Anyone can call this to record a change of keeper (net change only).
    function syncOwner(uint256 tokenId) external {
        _syncOwner(tokenId, nft.ownerOf(tokenId));
    }

    // ---------- internals: ownership ----------
    function _requireKeeper(uint256 tokenId) internal {
        address keeper = nft.ownerOf(tokenId);
        require(keeper == msg.sender, "Not the keeper");
        _syncOwner(tokenId, keeper);
    }

    function _syncOwner(uint256 tokenId, address current) internal {
        address last = lastOwner[tokenId];
        if (last == address(0)) {
            lastOwner[tokenId] = current;
        } else if (last != current) {
            lastOwner[tokenId] = current;
            _pushSimple(tokenId, KIND_HANDS, 0, 3000, _state[tokenId].weirdness);
            emit ChangedHands(tokenId, last, current);
        }
    }

    // ---------- internals: daily runs ----------
    function _chargeDailyRun(State storage s) internal {
        uint32 today = uint32(block.timestamp / 1 days);
        if (s.runsDay != today) {
            s.runsDay = today;
            s.runsToday = 0;
        }
        if (s.runsToday >= dailyFreeRuns) {
            require(extraRunFee > 0, "Daily runs used");
            require(chogToken.transferFrom(msg.sender, burnAddress, extraRunFee), "Fee failed");
        }
        if (s.runsToday < type(uint8).max) {
            s.runsToday += 1;
        }
    }

    // ---------- internals: odds ----------
    function _modifierToday() internal view returns (uint8 id, Modifier memory m) {
        uint256 len = _modifiers.length;
        if (len == 0) {
            return (0, Modifier(0, 0, 10000));
        }
        uint256 idx = uint256(keccak256(abi.encode(block.timestamp / 1 days))) % len;
        return (uint8(idx + 1), _modifiers[idx]);
    }

    function _appliesTo(Modifier memory m, uint8 experimentId) internal pure returns (bool) {
        return m.experimentId == 0 || m.experimentId == experimentId;
    }

    function _effectiveFailBps(Experiment memory ex, uint8 experimentId, uint8 risk) internal view returns (uint256) {
        int256 fb = int256(uint256(ex.failBps));
        if (risk == 0) {
            fb -= 1500;
        } else if (risk == 2) {
            fb += 1000;
        }
        (, Modifier memory m) = _modifierToday();
        if (_appliesTo(m, experimentId)) {
            fb += int256(m.failDeltaBps);
        }
        if (fb < 500) fb = 500;
        if (fb > 9500) fb = 9500;
        return uint256(fb);
    }

    function _isSuccess(Experiment memory ex, uint8 experimentId, uint8 risk, uint256 n) internal view returns (bool) {
        if (ex.oncePerToken) return false; // Origin always fails beautifully
        return (n % 10000) >= _effectiveFailBps(ex, experimentId, risk);
    }

    function _gain(Experiment memory ex, uint8 experimentId, uint8 risk, bool success, uint256 n)
        internal
        view
        returns (uint32)
    {
        uint256 lo = success ? ex.winMin : ex.failMin;
        uint256 hi = success ? ex.winMax : ex.failMax;
        uint256 base = lo + ((n >> 32) % (hi - lo + 1));
        if (ex.oncePerToken) return uint32(base);

        uint256 riskMul = risk == 0 ? 7000 : (risk == 2 ? 15000 : 10000);
        (, Modifier memory m) = _modifierToday();
        uint256 modMul = _appliesTo(m, experimentId) ? m.weirdnessMulBps : 10000;
        uint256 g = (base * riskMul / 10000) * modMul / 10000;
        if (g == 0) g = 1; // failing (or succeeding) always pays something
        return uint32(g);
    }

    // ---------- internals: resolving a run ----------
    function _resolve(
        uint256 tokenId,
        State storage s,
        uint8 experimentId,
        uint8 risk,
        Experiment memory ex,
        bool success,
        uint256 n
    ) internal returns (Result memory r) {
        s.weirdness += _gain(ex, experimentId, risk, success, n);
        r.success = success;
        r.seed = bytes32(n);
        r.noteId = uint16(uint256(experimentId) * 100 + (success ? 50 + ((n >> 48) % 2) : ((n >> 48) % 3)));

        if (success) {
            s.successCount = _inc16(s.successCount);
            s.failStreak = 0;
        } else {
            r.scarId = ex.failScar;
            s.failCount = _inc16(s.failCount);
            if (s.failStreak < type(uint8).max) s.failStreak += 1;
            _scars[tokenId][r.scarId] += (risk == 2 && !ex.oncePerToken) ? 2 : 1;
        }
        s.runCount = _inc16(s.runCount);
        r.weirdnessAfter = s.weirdness;

        Entry storage e = _history[tokenId].push();
        e.kind = success ? KIND_SUCCESS : KIND_FAIL;
        e.experimentId = experimentId;
        e.scarId = r.scarId;
        e.risk = risk;
        e.noteId = r.noteId;
        e.weirdnessAfter = r.weirdnessAfter;
        e.timestamp = uint64(block.timestamp);
    }

    function _pushSimple(uint256 tokenId, uint8 kind, uint8 experimentId, uint16 noteId, uint32 w) internal {
        Entry storage e = _history[tokenId].push();
        e.kind = kind;
        e.experimentId = experimentId;
        e.noteId = noteId;
        e.weirdnessAfter = w;
        e.timestamp = uint64(block.timestamp);
    }

    function _inc16(uint16 x) internal pure returns (uint16) {
        return x == type(uint16).max ? x : x + 1;
    }

    // ---------- internals: milestones, combos, standing ----------
    function _afterRun(uint256 tokenId, State storage s, uint8 experimentId, bool success) internal {
        uint8 prevExperiment = s.lastExperiment;
        uint64 prevActive = s.lastActive;

        if (!success && s.failCount == 1) _milestone(tokenId, s, M_FIRST_SCAR, 0);
        if (success && s.successCount == 1) _milestone(tokenId, s, M_FIRST_BREAKTHROUGH, 0);
        if (s.failCount >= 10) _milestone(tokenId, s, M_TEN_FAILURES, 0);
        if (s.runCount >= 25) _milestone(tokenId, s, M_TWENTY_FIVE_RUNS, 0);
        if (!success) {
            if (s.failStreak == 3) _milestone(tokenId, s, M_STREAK_3, 5);
            else if (s.failStreak == 6) _milestone(tokenId, s, M_STREAK_6, 5);
            else if (s.failStreak == 9) _milestone(tokenId, s, M_STREAK_9, 5);
        }

        _checkCombo(tokenId, s, prevExperiment, prevActive, experimentId);
        _updateStanding(tokenId, s);

        s.lastExperiment = experimentId;
        s.lastActive = uint64(block.timestamp);
    }

    function _milestone(uint256 tokenId, State storage s, uint8 id, uint32 bonus) internal {
        uint16 bit = uint16(1) << id;
        if ((s.milestones & bit) != 0) return;
        s.milestones |= bit;
        s.weirdness += bonus;
        _pushSimple(tokenId, KIND_MILESTONE, 0, uint16(1000) + id, s.weirdness);
        emit MilestoneReached(tokenId, id);
    }

    function _checkCombo(uint256 tokenId, State storage s, uint8 prevExp, uint64 prevActive, uint8 currentExp)
        internal
    {
        if (prevExp == 0 || prevActive == 0) return;
        if (block.timestamp - prevActive > 1 days) return;
        for (uint8 i = 0; i < 8; i++) {
            Combo memory c = combos[i];
            if (!c.exists || c.first != prevExp || c.second != currentExp) continue;
            uint8 bit = uint8(1) << i;
            if ((s.combosFound & bit) != 0) continue;
            s.combosFound |= bit;
            s.weirdness += c.bonus;
            uint8 comboId = i + 1;
            _pushSimple(tokenId, KIND_COMBO, currentExp, uint16(2000) + comboId, s.weirdness);
            emit ComboFound(tokenId, comboId);
        }
    }

    function _standingFor(uint32 w) internal view returns (uint8) {
        if (w >= standingThresholds[2]) return 3;
        if (w >= standingThresholds[1]) return 2;
        if (w >= standingThresholds[0]) return 1;
        return 0;
    }

    function _updateStanding(uint256 tokenId, State storage s) internal {
        uint8 old = s.standing;
        uint8 next = _standingFor(s.weirdness);
        if (next <= old) return;
        s.standing = next;
        for (uint8 st = old + 1; st <= next; st++) {
            _milestone(tokenId, s, 6 + st, 0);
        }
    }

    // =====================================================
    //                         VIEWS
    // =====================================================
    function getState(uint256 tokenId) external view returns (State memory state, address lastKnownOwner) {
        return (_state[tokenId], lastOwner[tokenId]);
    }

    function getScarCounts(uint256 tokenId) external view returns (uint16[9] memory) {
        return _scars[tokenId];
    }

    function standingOf(uint256 tokenId) external view returns (uint8) {
        return _state[tokenId].standing;
    }

    function combosFound(uint256 tokenId) external view returns (uint8) {
        return _state[tokenId].combosFound;
    }

    function historyLength(uint256 tokenId) external view returns (uint256) {
        return _history[tokenId].length;
    }

    /// Oldest first. Frontends can read from the end for newest-first.
    function getHistory(uint256 tokenId, uint256 offset, uint256 limit)
        external
        view
        returns (Entry[] memory entries, uint256 total)
    {
        Entry[] storage h = _history[tokenId];
        total = h.length;
        if (offset >= total) {
            return (new Entry[](0), total);
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        entries = new Entry[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            entries[i - offset] = h[i];
        }
    }

    function dailyRunsLeft(uint256 tokenId) external view returns (uint8) {
        State storage s = _state[tokenId];
        uint32 today = uint32(block.timestamp / 1 days);
        uint8 used = s.runsDay == today ? s.runsToday : 0;
        return used >= dailyFreeRuns ? 0 : dailyFreeRuns - used;
    }

    function todaysModifier()
        external
        view
        returns (uint8 modifierId, uint8 experimentId, int16 failDeltaBps, uint16 weirdnessMulBps)
    {
        (uint8 id, Modifier memory m) = _modifierToday();
        return (id, m.experimentId, m.failDeltaBps, m.weirdnessMulBps);
    }

    function modifierCount() external view returns (uint256) {
        return _modifiers.length;
    }

    // =====================================================
    //                  CONFIG (owner, lockable)
    // =====================================================
    modifier whenUnlocked() {
        require(!configLocked, "Config locked");
        _;
    }

    function setExperiment(uint8 id, Experiment calldata ex) external onlyOwner whenUnlocked {
        require(ex.failBps <= 10000, "Bad failBps");
        require(ex.failMax >= ex.failMin && ex.winMax >= ex.winMin, "Bad ranges");
        require(ex.failScar >= 1 && ex.failScar <= 8, "Bad scar");
        Experiment memory e = ex;
        e.exists = true;
        experiments[id] = e;
    }

    function setStandingThresholds(uint32 known, uint32 marked, uint32 legendary) external onlyOwner whenUnlocked {
        require(known > 0 && marked > known && legendary > marked, "Not ascending");
        standingThresholds = [known, marked, legendary];
    }

    function setDailyFreeRuns(uint8 n) external onlyOwner whenUnlocked {
        dailyFreeRuns = n;
    }

    function setExtraRunFee(uint256 fee) external onlyOwner whenUnlocked {
        extraRunFee = fee;
    }

    function setCombo(uint8 comboId, uint8 first, uint8 second, uint16 bonus) external onlyOwner whenUnlocked {
        require(comboId >= 1 && comboId <= 8, "Bad combo id");
        combos[comboId - 1] = Combo(true, first, second, bonus);
    }

    function setModifiers(Modifier[] calldata list) external onlyOwner whenUnlocked {
        delete _modifiers;
        for (uint256 i = 0; i < list.length; i++) {
            require(list[i].weirdnessMulBps > 0, "Bad multiplier");
            _modifiers.push(list[i]);
        }
    }

    /// One-way. After this, the odds can never change: nobody can alter the game, and no function ever edits a token's state.
    function lockConfig() external onlyOwner {
        configLocked = true;
    }
}
