param(
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'Zuba Solar App.lnk'

if ($Remove) {
  if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
    Write-Output 'Removed the Zuba automatic-start shortcut. App files and database were not changed.'
  } else {
    Write-Output 'The Zuba automatic-start shortcut was not installed.'
  }
  exit 0
}

$npm = Get-Command npm.cmd -ErrorAction Stop
Get-Command python -ErrorAction Stop | Out-Null
$pythonCheck = & python -c 'import flask, dotenv' 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Python dependencies are missing. Run 'python -m pip install -r backend\requirements.txt' first. $pythonCheck"
}

$distIndex = Join-Path $projectRoot 'dist\index.html'
if (-not (Test-Path -LiteralPath $distIndex)) {
  & $npm.Source run build
  if ($LASTEXITCODE -ne 0) {
    throw 'The React production build failed; the automatic-start shortcut was not installed.'
  }
}

$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$launcherScript = Join-Path $PSScriptRoot 'start-app.ps1'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellExe
$shortcut.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcherScript`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start the local Zuba Solar app and open it in your browser.'
$shortcut.Save()

Write-Output "Installed automatic startup for the current Windows user: $shortcutPath"
Write-Output 'The app will start hidden and open http://127.0.0.1:3000 when its API is ready.'
