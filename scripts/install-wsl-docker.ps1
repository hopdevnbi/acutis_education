#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Installs WSL 2 and Docker Desktop (CLI included) for local catechism-api development.

.DESCRIPTION
  Phase 1 (default): enables Windows features, installs WSL, WSL2 kernel update.
  Reboot is required before Phase 2.

  Phase 2 (-PostReboot): sets WSL2 default, installs Ubuntu, installs Docker Desktop 4.49.0
  (last winget version compatible with Windows 10 1903 / build 18362).

  Run from an elevated PowerShell:
    Set-ExecutionPolicy -Scope Process Bypass
    .\scripts\install-wsl-docker.ps1

  After reboot:
    .\scripts\install-wsl-docker.ps1 -PostReboot

.NOTES
  - Docker Desktop includes `docker` and `docker compose` CLI.
  - Latest Docker Desktop (>4.49) requires Windows 10 22H2+; this script pins 4.49.0 for 1903.
  - Upgrade Windows to 22H2 or newer when possible, then update Docker Desktop.
#>
param(
  [switch]$PostReboot,
  [switch]$SkipRebootPrompt
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$WslKernelUpdateUrl = 'https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi'
$DockerDesktopVersion = '4.49.0'
$UbuntuDistro = 'Ubuntu'

$LogFile = Join-Path $PSScriptRoot 'install-wsl-docker.log'

function Write-Log {
  param([string]$Message)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Add-Content -Path $LogFile -Value $line
  Write-Host $Message
}

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
  Write-Log $Message
}

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-WindowsBuild {
  $version = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
  return [int]$version.CurrentBuild, [int]$version.UBR
}

function Enable-WindowsFeature {
  param([string]$FeatureName)

  Write-Step "Enabling Windows feature: $FeatureName"
  $process = Start-Process -FilePath 'dism.exe' -ArgumentList @(
    '/online',
    '/enable-feature',
    "/featurename:$FeatureName",
    '/all',
    '/norestart'
  ) -Wait -PassThru -NoNewWindow

  if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
    throw "dism.exe failed for $FeatureName with exit code $($process.ExitCode)"
  }
}

function Install-WslKernelUpdate {
  Write-Step 'Installing WSL2 kernel update package'
  $installerPath = Join-Path $env:TEMP 'wsl_update_x64.msi'

  Invoke-WebRequest -Uri $WslKernelUpdateUrl -OutFile $installerPath
  $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList @(
    '/i',
    $installerPath,
    '/quiet',
    '/norestart'
  ) -Wait -PassThru -NoNewWindow

  if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
    throw "WSL2 kernel update failed with exit code $($process.ExitCode)"
  }
}

function Test-WingetExitSuccess {
  param([int]$ExitCode)

  # 0 = success
  # -1978335189 = package already installed
  # -1978334966 = reboot required before Windows features are fully active
  $acceptedExitCodes = @(0, -1978335189, -1978334966)
  return $acceptedExitCodes -contains $ExitCode
}

function Test-WingetRebootRequired {
  param([int]$ExitCode)

  return $ExitCode -eq -1978334966
}

function Install-WslApplication {
  if (-not (Test-CommandExists 'winget')) {
    throw 'winget is required but was not found. Install App Installer from Microsoft Store.'
  }

  Write-Step 'Installing Windows Subsystem for Linux (Microsoft.WSL)'
  & winget install --id Microsoft.WSL -e --accept-package-agreements --accept-source-agreements
  if (Test-WingetRebootRequired -ExitCode $LASTEXITCODE) {
    Write-Host 'Windows features need a reboot before WSL can finish installing.' -ForegroundColor Yellow
    return 'reboot-required'
  }

  if (-not (Test-WingetExitSuccess -ExitCode $LASTEXITCODE)) {
    throw "winget install Microsoft.WSL failed with exit code $LASTEXITCODE"
  }

  return 'ok'
}

function Install-UbuntuDistro {
  Write-Step "Installing Linux distro: $UbuntuDistro"

  if (-not (Test-CommandExists 'wsl')) {
    throw 'wsl.exe is not available yet. Reboot and run this script with -PostReboot.'
  }

  Install-WslKernelUpdate

  & wsl --set-default-version 2
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'Warning: could not set WSL2 as default yet. Continuing with Ubuntu install.' -ForegroundColor Yellow
    Write-Log "wsl --set-default-version 2 exit code: $LASTEXITCODE"
  }

  $distroListText = (& wsl -l 2>&1 | Out-String)
  if ($distroListText -match 'Ubuntu') {
    Write-Host 'Ubuntu is already installed.'
    return
  }

  $wslHelpText = (& wsl --help 2>&1 | Out-String)
  if ($wslHelpText -match '--install') {
    Write-Step 'Installing Ubuntu via wsl --install'
    & wsl --install -d $UbuntuDistro --no-launch
    if ($LASTEXITCODE -ne 0) {
      & wsl --install --distribution $UbuntuDistro
    }
  }

  $distroListText = (& wsl -l 2>&1 | Out-String)
  if ($distroListText -match 'Ubuntu') {
    Write-Host 'Ubuntu installed successfully.'
    return
  }

  Write-Step 'Installing Ubuntu 22.04 via winget (legacy WSL on Windows 10 1903)'
  & winget install -e --id Canonical.Ubuntu.2204 --accept-package-agreements --accept-source-agreements
  if (-not (Test-WingetExitSuccess -ExitCode $LASTEXITCODE)) {
    throw "winget install Canonical.Ubuntu.2204 failed with exit code $LASTEXITCODE"
  }
}

function Install-DockerDesktop {
  Write-Step "Installing Docker Desktop $DockerDesktopVersion (includes docker CLI)"

  & winget install --id Docker.DockerDesktop -e --version $DockerDesktopVersion `
    --accept-package-agreements --accept-source-agreements

  if (-not (Test-WingetExitSuccess -ExitCode $LASTEXITCODE)) {
    throw "winget install Docker.DockerDesktop failed with exit code $LASTEXITCODE"
  }
}

function Request-Reboot {
  param([string]$Reason)

  Write-Host ""
  Write-Host $Reason -ForegroundColor Green

  if (-not $SkipRebootPrompt) {
    $answer = Read-Host 'Reboot now? (Y/N)'
    if ($answer -match '^[Yy]$') {
      shutdown /r /t 30 /c 'Rebooting to finish WSL/Docker setup. After login, run scripts/install-wsl-docker.ps1 -PostReboot'
      exit 0
    }
  }

  Write-Host 'After reboot, run:'
  Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/install-wsl-docker.ps1 -PostReboot'
  exit 0
}

function Show-NextSteps {
  Write-Host ""
  Write-Host 'Next steps:' -ForegroundColor Green
  Write-Host '1. Open Docker Desktop from the Start menu.'
  Write-Host '2. Accept the license and wait until Docker Engine is running.'
  Write-Host '3. Settings -> General -> ensure "Use the WSL 2 based engine" is enabled.'
  Write-Host '4. Close and reopen PowerShell, then verify:'
  Write-Host '     docker --version'
  Write-Host '     docker compose version'
  Write-Host '5. In the project folder:'
  Write-Host '     copy .env.example .env'
  Write-Host '     docker compose up -d'
  Write-Host ""
  Write-Host 'Consider upgrading Windows 10 to 22H2 (19045) or newer to use a current Docker Desktop release.' -ForegroundColor Yellow
}

$build, $ubr = Get-WindowsBuild
Write-Log "Detected Windows build $build.$ubr"
Write-Host "Detected Windows build $build.$ubr"
Write-Log "Log file: $LogFile"

try {

if ($build -lt 18362) {
  throw 'Windows 10 build 18362 or higher is required for WSL2.'
}

if ($build -lt 19045) {
  Write-Host "Windows build $build is below Docker Desktop 22H2 requirement; pinning Docker Desktop $DockerDesktopVersion." -ForegroundColor Yellow
}

if (-not $PostReboot) {
  Write-Step 'Phase 1 — enable platform features and install WSL foundation'

  Enable-WindowsFeature -FeatureName 'Microsoft-Windows-Subsystem-Linux'
  Enable-WindowsFeature -FeatureName 'VirtualMachinePlatform'

  $wslInstallResult = Install-WslApplication
  if ($wslInstallResult -eq 'reboot-required') {
    Request-Reboot -Reason 'Phase 1 enabled Windows features. Reboot before WSL/Docker can finish installing.'
  }

  Install-WslKernelUpdate
  Request-Reboot -Reason 'Phase 1 complete. Reboot before continuing with WSL2 and Docker Desktop.'
}

Write-Step 'Phase 2 — configure WSL2, Ubuntu, and Docker Desktop'

$wslInstallResult = Install-WslApplication
if ($wslInstallResult -eq 'reboot-required') {
  Request-Reboot -Reason 'WSL still needs one more reboot before Ubuntu/Docker can be installed.'
}

Install-UbuntuDistro
Install-DockerDesktop
Show-NextSteps
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  Write-Host $_.Exception.Message -ForegroundColor Red
  throw
}
