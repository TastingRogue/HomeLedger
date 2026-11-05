param([Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference='Stop'
$artifacts=Get-ChildItem -LiteralPath $Directory -File -Filter '*.exe'
if (!$artifacts) { throw 'No installer to verify' }
foreach ($file in $artifacts) {
  $signature=Get-AuthenticodeSignature -LiteralPath $file.FullName
  if ($signature.Status -ne 'Valid') { throw "Invalid signature: $($file.Name)" }
}
$app=Join-Path $Directory 'win-unpacked/homeledger.exe'
if ((Get-AuthenticodeSignature -LiteralPath $app).Status -ne 'Valid') { throw 'Invalid application signature' }
Write-Output 'Installer and application signatures verified.'
