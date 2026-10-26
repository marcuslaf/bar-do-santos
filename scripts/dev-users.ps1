# Cria usuários de teste no Supabase local (idempotente).
# Uso: pwsh scripts/dev-users.ps1 [-StaffPhone 11999990002]
#
# O que faz:
#   1. cria (ou reaproveita) os usuários no Auth via admin API, com e-mail
#      sintético derivado do celular (`<digitos>@celular.local`);
#   2. garante senha conhecida nos acessos de teste;
#   3. vincula a equipe como staff e deixa o terceiro sem vínculo;
#   4. cria o dono de teste APENAS se a org ainda não tiver nenhum owner.
#
# Requer: `supabase start` rodando + apps/web/.env.local gerado por local-env.ps1.

param(
    [string]$OwnerPhone = "11999990001",
    [string]$StaffPhone = "11999990002",
    [string]$LoosePhone = "11999990003",
    [string]$Password = "senha12345",
    [string]$OwnerName = "Dono",
    [string]$StaffName = "Equipe"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "apps\web\.env.local"

if (-not (Test-Path $envFile)) {
    Write-Error "apps/web/.env.local não existe. Rode 'pwsh scripts/local-env.ps1' primeiro."
}

$settings = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { $settings[$Matches[1]] = $Matches[2] }
}

$serviceKey = $settings["SUPABASE_SERVICE_ROLE_KEY"]
$apiUrl = $settings["NEXT_PUBLIC_SUPABASE_URL"]

if (-not $serviceKey -or -not $apiUrl) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL ausentes em .env.local."
}

# O nome do container do banco é derivado do project_id em supabase/config.toml.
# Sem isso, renomear o projeto quebra este script silenciosamente.
$dbContainer = "supabase_db_bar-do-santos"
$configPath = Join-Path $root "supabase\config.toml"
if (Test-Path $configPath) {
    $projectIdLine = Select-String -Path $configPath -Pattern '^\s*project_id\s*=\s*"([^"]+)"' | Select-Object -First 1
    if ($projectIdLine) {
        $dbContainer = "supabase_db_" + $projectIdLine.Matches[0].Groups[1].Value
    }
}

$headers = @{
    apikey        = $serviceKey
    Authorization = "Bearer $serviceKey"
}

function Get-AuthEmail([string]$phoneDigits) {
    return "$phoneDigits@celular.local"
}

function Invoke-AuthApi([string]$method, [string]$path, $body) {
    $params = @{
        Uri         = "$apiUrl/auth/v1$path"
        Method      = $method
        Headers     = $headers
        ContentType = "application/json"
    }
    if ($null -ne $body) { $params["Body"] = ($body | ConvertTo-Json -Depth 5) }
    return Invoke-RestMethod @params
}

function Get-OrCreateUser([string]$email, [string]$displayName) {
    $existing = (Invoke-AuthApi "GET" "/admin/users?per_page=200" $null).users |
        Where-Object { $_.email -eq $email } |
        Select-Object -First 1

    if ($existing) {
        Write-Host "  usuário já existe: $email" -ForegroundColor DarkGray
        return $existing
    }

    $created = Invoke-AuthApi "POST" "/admin/users" @{
        email          = $email
        password       = $Password
        email_confirm  = $true
        user_metadata  = @{ display_name = $displayName }
    }
    Write-Host "  usuário criado: $email" -ForegroundColor Green
    return $created
}

Write-Host "Supabase local: $apiUrl" -ForegroundColor Cyan

# O app é single-org: se a org já tem um owner (real, criado fora deste script),
# não criamos outro. Apenas informamos quem já é.
$existingOwner = docker exec $dbContainer psql -U postgres -d postgres -tAc "select display_name || ' (' || coalesce(phone, 'sem celular') || ')' from public.org_members where role = 'owner' order by created_at asc limit 1;" | Out-String
$existingOwner = $existingOwner.Trim()

$ownerEmail = Get-AuthEmail $OwnerPhone
$staffEmail = Get-AuthEmail $StaffPhone
$looseEmail = Get-AuthEmail $LoosePhone

$staffUser = Get-OrCreateUser $staffEmail $StaffName
$null = Get-OrCreateUser $looseEmail "Sem vinculo"

# Senha conhecida mesmo quando o usuário é reaproveitado de outra execução.
Invoke-AuthApi "PUT" "/admin/users/$($staffUser.id)" @{ password = $Password } | Out-Null

$staffSql = @"
insert into public.org_members (org_id, user_id, display_name, role, phone)
select o.id, '$($staffUser.id)', '$StaffName', 'staff', '$StaffPhone'
from public.orgs o
where not exists (
  select 1 from public.org_members m
  where m.user_id = '$($staffUser.id)'
);
"@

docker exec $dbContainer psql -U postgres -d postgres -c $staffSql

# Backfill do celular para vínculos criados antes da coluna existir (idempotente).
$staffPhoneSql = "update public.org_members set phone = '$StaffPhone' where user_id = '$($staffUser.id)' and phone is null;"
docker exec $dbContainer psql -U postgres -d postgres -c $staffPhoneSql

if ($existingOwner) {
    Write-Host "  owner já existe: $existingOwner" -ForegroundColor DarkGray
} else {
    $ownerUser = Get-OrCreateUser $ownerEmail $OwnerName
    Invoke-AuthApi "PUT" "/admin/users/$($ownerUser.id)" @{ password = $Password } | Out-Null

    # O dono precisa existir em auth.users antes do bootstrap (a função busca por e-mail).
    $bootstrapSql = "select public.bootstrap_owner('" + $ownerEmail.ToLower() + "');"
    docker exec $dbContainer psql -U postgres -d postgres -tAc $bootstrapSql

    # bootstrap_owner só conhece e-mail; o celular é preenchido aqui (idempotente).
    $ownerPhoneSql = "update public.org_members set phone = '$OwnerPhone' where user_id = '$($ownerUser.id)' and phone is null;"
    docker exec $dbContainer psql -U postgres -d postgres -c $ownerPhoneSql
}

Write-Host ""
Write-Host "Pronto. Senha dos acessos de teste: '$Password'" -ForegroundColor Green
if ($existingOwner) {
    Write-Host "  owner       -> já cadastrado ($existingOwner); senha não alterada"
} else {
    Write-Host "  dono (teste)-> $OwnerPhone"
}
Write-Host "  equipe      -> $StaffPhone"
Write-Host "  sem vinculo -> $LoosePhone (cai em /sem-acesso)"
