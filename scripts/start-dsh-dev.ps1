$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$env:DSH_HOME = Join-Path $projectRoot '.dsh-dev'

$installScript = Join-Path $PSScriptRoot 'install-dsh-dev.ps1'
$dshBin = Join-Path $projectRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'

Push-Location $projectRoot
try {
  & $installScript
  if ($LASTEXITCODE -ne 0) {
    throw "Project-local DSH setup failed with exit code $LASTEXITCODE."
  }

  if (-not (Test-Path -LiteralPath $dshBin)) {
    throw "Project-local DSH CLI was not installed: $dshBin"
  }

  New-Item -ItemType Directory -Force -Path $env:DSH_HOME | Out-Null
  node $dshBin --profile web --no-open --port 0
} finally {
  Pop-Location
}
