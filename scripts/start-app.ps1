$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logDirectory = Join-Path $env:LOCALAPPDATA 'ZubaSolar\logs'
$stdoutLog = Join-Path $logDirectory 'app-startup.out.log'
$stderrLog = Join-Path $logDirectory 'app-startup.err.log'
$appUrl = 'http://127.0.0.1:3000'
$healthUrl = "$appUrl/api/health"
$apiHealthUrl = 'http://127.0.0.1:5001/api/health'

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Test-ZubaApi {
  try {
    $health = Invoke-RestMethod -Uri $apiHealthUrl -TimeoutSec 2
    return $health.status -eq 'ok' -and $health.service -eq 'Zuba Solar API'
  } catch {
    return $false
  }
}

function Test-AppServer {
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    return $health.status -eq 'ok' -and $health.service -eq 'Zuba Solar API'
  } catch {
    return $false
  }
}

try {
  if (-not (Test-ZubaApi)) {
    $npm = Get-Command npm.cmd -ErrorAction Stop
    $env:NODE_ENV = 'production'
    $env:PORT = '3000'
    $env:ZUBA_API_PORT = '5001'

    $commandLine = "/d /c call `"$($npm.Source)`" start"
    Start-Process `
      -FilePath $env:ComSpec `
      -ArgumentList $commandLine `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stderrLog | Out-Null
  }

  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    if ((Test-ZubaApi) -and (Test-AppServer)) {
      Start-Process $appUrl
      exit 0
    }
    Start-Sleep -Seconds 2
  }

  throw "Zuba did not become ready at $appUrl within 60 seconds. Check $stderrLog."
} catch {
  $_ | Out-String | Add-Content -LiteralPath $stderrLog
  exit 1
}
