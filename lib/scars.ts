// Scar ids match ChogStateRegistry (1..8). Index 0 is unused.
export const SCAR = {
  MELTDOWN: 1, THIRD_EYE: 2, TIME_CRACKS: 3, MEME_STATIC: 4,
  WEIGHTLESS: 5, GHOST_ECHO: 6, FIRST_MARK: 7, CANDY_ROT: 8,
} as const;

export const SCAR_NAMES: Record<number, string> = {
  1: "Meltdown", 2: "Third Eye", 3: "Time Cracks", 4: "Meme Static",
  5: "Weightless", 6: "Ghost Echo", 7: "First Mark", 8: "Candy Rot",
};

export type Level = 0 | 1 | 2 | 3;

/** Counts 1-2 = level 1, 3-5 = level 2, 6+ = level 3. */
export function levelOf(count: number): Level {
  return count >= 6 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0;
}

export function levelsOf(scars: number[]): Level[] {
  const out: Level[] = [];
  for (let i = 0; i < 9; i++) out.push(levelOf(scars[i] ?? 0));
  return out;
}
