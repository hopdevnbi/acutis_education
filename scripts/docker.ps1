param(
  [string]$Distro,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$DockerArgs
)

if ($Distro) {
  & wsl -d $Distro -- docker @DockerArgs
} else {
  & wsl -- docker @DockerArgs
}

exit $LASTEXITCODE
