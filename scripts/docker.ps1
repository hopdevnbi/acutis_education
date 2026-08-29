param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$DockerArgs
)

& wsl -d Ubuntu -- docker @DockerArgs
exit $LASTEXITCODE
