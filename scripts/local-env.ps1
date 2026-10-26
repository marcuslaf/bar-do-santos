# Gera apps/web/.env.local a partir do Supabase local (supabase status).
# Uso: pwsh scripts/local-env.ps1
# Requer: docker rodando + `supabase start` já executado.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$status = supabase status -o env 2>$null
if (-not $status) {
    Write-Error "Supabase local não está rodando. Execute 'supabase start' primeiro."
}

function Get-StatusValue([string]$key) {
    $line = $status | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -replace "^$key=", "").Trim('"')
}

$apiUrl = Get-StatusValue "API_URL"
$anonKey = Get-StatusValue "ANON_KEY"
$serviceKey = Get-StatusValue "SERVICE_ROLE_KEY"

if (-not $apiUrl -or -not $anonKey -or -not $serviceKey) {
    Write-Error "Não foi possível ler API_URL/ANON_KEY/SERVICE_ROLE_KEY do 'supabase status'."
}

$content = @"
# Gerado por scripts/local-env.ps1 — NÃO commitar.
NEXT_PUBLIC_SUPABASE_URL=$apiUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceKey
"@

$target = Join-Path $root "apps\web\.env.local"
[System.IO.File]::WriteAllText($target, $content + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "apps/web/.env.local atualizado (Supabase local: $apiUrl)" -ForegroundColor Green
