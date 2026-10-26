# ============================================
# pre-push-hook.ps1
# Valida arquivos antes de push ao GitHub
# Instale: copie para .git/hooks/pre-push (sem extensão)
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "🔍 Verificando arquivos antes do push..." -ForegroundColor Cyan

# === 1. Verificar se há secrets no staged ===
Write-Host "`n[1/4] Verificando secrets..." -ForegroundColor Yellow

$secrets = git diff --cached --name-only | Where-Object {
    $_ -match '\.(env|pem|key|cert|p12|pfx|jks|secret)$' -or
    $_ -match 'credentials\.json' -or
    $_ -match 'service-account.*\.json'
}

if ($secrets) {
    Write-Host "❌ ARQUIVOS COM SECRETS DETECTADOS:" -ForegroundColor Red
    $secrets | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    Write-Host "`nRemova-os do commit: git reset HEAD <arquivo>" -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✅ Nenhum secret detectado" -ForegroundColor Green

# === 2. Verificar arquivos grandes (>1MB) ===
Write-Host "`n[2/4] Verificando arquivos grandes..." -ForegroundColor Yellow

$largeFiles = git diff --cached --name-only | ForEach-Object {
    if (Test-Path $_) {
        $size = (Get-Item $_).Length
        if ($size -gt 1MB) {
            [PSCustomObject]@{
                File = $_
                SizeMB = [math]::Round($size / 1MB, 2)
            }
        }
    }
}

if ($largeFiles) {
    Write-Host "⚠️  ARQUIVOS GRANDES DETECTADOS (>1MB):" -ForegroundColor Yellow
    $largeFiles | ForEach-Object {
        Write-Host "   $($_.File) - $($_.SizeMB) MB" -ForegroundColor Yellow
    }
    Write-Host "`nConsidere usar Git LFS ou armazenamento externo." -ForegroundColor Yellow
    Write-Host "Para ignorar: git reset HEAD <arquivo>" -ForegroundColor Yellow

    $continue = Read-Host "Continuar mesmo assim? (s/N)"
    if ($continue -ne 's' -and $continue -ne 'S') {
        exit 1
    }
} else {
    Write-Host "   ✅ Nenhum arquivo grande detectado" -ForegroundColor Green
}

# === 3. Verificar arquivos de build/gerados ===
Write-Host "`n[3/4] Verificando arquivos de build..." -ForegroundColor Yellow

$buildPatterns = @(
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'coverage/',
    '__pycache__/',
    'target/',
    'bin/',
    'obj/'
)

$buildFiles = git diff --cached --name-only | Where-Object {
    $file = $_
    $buildPatterns | Where-Object { $file -like "*$_*" }
}

if ($buildFiles) {
    Write-Host "❌ ARQUIVOS DE BUILD DETECTADOS:" -ForegroundColor Red
    $buildFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    Write-Host "`nAdicione ao .gitignore e remova do commit." -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✅ Nenhum arquivo de build detectado" -ForegroundColor Green

# === 4. Resumo ===
Write-Host "`n[4/4] Resumo do commit:" -ForegroundColor Yellow

$files = git diff --cached --name-only
Write-Host "   Arquivos sendo commitados: $($files.Count)" -ForegroundColor Cyan

# Contar por tipo
$byExtension = $files | Group-Object { [System.IO.Path]::GetExtension($_) } | Sort-Object Count -Descending
Write-Host "`n   Por tipo:" -ForegroundColor Cyan
$byExtension | Select-Object -First 10 | ForEach-Object {
    Write-Host "   $($_.Name): $($_.Count)" -ForegroundColor Gray
}

Write-Host "`n✅ Push autorizado!" -ForegroundColor Green
exit 0
