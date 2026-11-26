# One command to run the whole stack locally on Windows (PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts\start.ps1
# Same as scripts/start.sh: .env with your OpenRouter key, build and start, wait, two sample offers, where to look.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop is needed: https://docs.docker.com/get-docker/' }
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host 'Created .env from .env.example' }
$envText = Get-Content .env -Raw
function EnvVal($name, $default) { if ($envText -match "(?m)^$name=(.*)$" -and $Matches[1].Trim()) { $Matches[1].Trim() } else { $default } }
if (-not (EnvVal 'OPENROUTER_API_KEY' '')) {
  Write-Host 'The offer workflow writes the slides with a model on OpenRouter. Create a key at https://openrouter.ai/keys'
  $key = Read-Host 'OpenRouter API key'
  if (-not $key) { throw 'No key, stopping.' }
  $envText = $envText -replace '(?m)^OPENROUTER_API_KEY=.*$', "OPENROUTER_API_KEY=$key"
  Set-Content .env $envText -NoNewline
}
$n8nPort = EnvVal 'N8N_PORT' '5678'; $landingPort = EnvVal 'LANDING_PORT' '8080'
$studioPort = EnvVal 'STUDIO_PORT' '8082'; $figcraftPort = EnvVal 'FIGCRAFT_PORT' '8081'
$studioPassword = EnvVal 'SERVICE_PASSWORD_STUDIO' 'studio'

Write-Host 'Building and starting the stack (the first time takes about 2-3 minutes)...'
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
if ($LASTEXITCODE) { throw 'docker compose up failed' }

Write-Host 'Waiting for n8n to publish the offer workflow...'
for ($i = 0; $i -lt 90; $i++) {
  if ((docker compose -f docker-compose.yml -f docker-compose.local.yml logs n8n 2>$null) -match 'Editor is now accessible') { break }
  Start-Sleep 2
}
Start-Sleep 5

Write-Host 'Generating two sample offers...'
New-Item -ItemType Directory -Force out | Out-Null
if (Get-Command node -ErrorAction SilentlyContinue) {
  $env:N8N = "http://localhost:$n8nPort"
  node scripts/try-it.mjs sample-data/landing-persona-firm-pl.json sample-data/landing-call-logistics-group.json
} else {
  $hook = "http://localhost:$n8nPort/webhook/dd7c4b67-f5f6-40f4-9325-1ca924d5ff78"
  Invoke-WebRequest -Method Post -ContentType 'application/json' -InFile sample-data/landing-persona-firm-pl.json -Uri $hook -OutFile out/landing-persona-firm-pl.pdf
  Write-Host 'out/landing-persona-firm-pl.pdf'
}

Write-Host ''
Write-Host 'Ready.'
Write-Host "  Landing        http://localhost:$landingPort"
Write-Host "  Offer Studio   http://localhost:$studioPort   any user name, password: $studioPassword"
Write-Host "  n8n            http://localhost:$n8nPort   demo@example.com / gaius-jury-2026"
Write-Host "  FigCraft       http://localhost:$figcraftPort"
Write-Host '  Decks          .\out\*.pdf'
Write-Host '  Stop: docker compose -f docker-compose.yml -f docker-compose.local.yml down'
