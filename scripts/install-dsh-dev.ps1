$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$env:DSH_HOME = Join-Path $projectRoot '.dsh-dev'
$dshBin = Join-Path $projectRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'
$archivePlugin = '@michengai/dsh-archive-manager@0.1.41'

Push-Location $projectRoot
try {
  foreach ($tool in @('node', 'pnpm')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
      throw "$tool is required. Install the system toolchain before running setup."
    }
  }

  # Use the native pnpm environment and the checked-in dependency lock.
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) {
    throw "Project dependency installation failed with exit code $LASTEXITCODE."
  }
  if (-not (Test-Path -LiteralPath $dshBin)) {
    throw "Project-local DSH CLI was not installed: $dshBin"
  }

  New-Item -ItemType Directory -Force -Path $env:DSH_HOME | Out-Null
  node $dshBin plugin --profile web add .
  if ($LASTEXITCODE -ne 0) {
    throw "Just Chat installation failed with exit code $LASTEXITCODE."
  }
  # Dev companion only: do not add archive management to the published bundle.
  node $dshBin plugin --profile web add $archivePlugin --registry=https://registry.npmjs.org/
  if ($LASTEXITCODE -ne 0) {
    throw "Archive Manager installation failed with exit code $LASTEXITCODE."
  }
  Write-Host "DSH development Home ready: $env:DSH_HOME"
} finally {
  Pop-Location
}
