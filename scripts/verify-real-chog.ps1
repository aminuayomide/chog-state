$rpc = "https://rpc.monad.xyz"
$nft = "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"

function Call-Eth($data) {
  $body = @{ jsonrpc="2.0"; id=1; method="eth_call"; params=@(@{ to=$nft; data=$data }, "latest") } | ConvertTo-Json -Depth 5
  $r = Invoke-RestMethod -Uri $rpc -Method Post -ContentType "application/json" -Body $body
  if ($r.error) { return "ERROR: $($r.error.message)" }
  return $r.result
}

function Decode-Str($hex) {
  if ($hex -like "ERROR*") { return $hex }
  $h = $hex.Substring(2)
  $len = [Convert]::ToInt32($h.Substring(120,8), 16)
  $d = $h.Substring(128, $len*2)
  $bytes = for ($i=0; $i -lt $d.Length; $i+=2) { [Convert]::ToByte($d.Substring($i,2),16) }
  [Text.Encoding]::UTF8.GetString($bytes)
}

$pad = "0"*56
"Name:            " + (Decode-Str (Call-Eth "0x06fdde03"))
"Symbol:          " + (Decode-Str (Call-Eth "0x95d89b41"))
$ts = Call-Eth "0x18160ddd"
if ($ts -like "ERROR*") { "TotalSupply:     $ts" } else { "TotalSupply:     " + [Convert]::ToInt64($ts.Substring($ts.Length-8),16) }
"Is ERC-721:      " + (Call-Eth ("0x01ffc9a7" + "80ac58cd" + $pad))
"Is enumerable:   " + (Call-Eth ("0x01ffc9a7" + "780e9d63" + $pad))
"tokenURI 1049:   " + (Decode-Str (Call-Eth ("0xc87b56dd" + (1049).ToString("x64"))))
"ownerOf 1049:    " + (Call-Eth ("0x6352211e" + (1049).ToString("x64")))