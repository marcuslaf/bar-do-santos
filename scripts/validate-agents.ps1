<#
.SYNOPSIS
    Valida todos os agents em .agents/rules/
.DESCRIPTION
    Verifica frontmatter, markdown válido, matriz de versão, checklist não vazio, anti-patterns
.NOTES
    Uso: .\validate-agents.ps1 [-Strict] [-OutputJson]
#>

param(
    [switch]$Strict,
    [switch]$OutputJson
)

$RulesPath = "C:\Users\marcu\.agents\rules"
$Results = @()
$Errors = 0
$Warnings = 0

function Add-Result {
    param($File, $Level, $Message, $Detail)
    $Results += [PSCustomObject]@{
        File = $File
        Level = $Level
        Message = $Message
        Detail = $Detail
    }
    if ($Level -eq 'ERROR') { $Errors++ } elseif ($Level -eq 'WARN') { $Warnings++ }
}

$Files = Get-ChildItem "$RulesPath\*.md" | Where-Object { $_.Name -ne 'AGENTS.md' -and $_.Name -ne 'AGENTS-ROUTING.md' }

Write-Host "Validando $($Files.Count) agents em $RulesPath..." -ForegroundColor Cyan

foreach ($File in $Files) {
    $Content = Get-Content $File.FullName -Raw
    $Name = $File.Name
    $Lines = (Get-Content $File.FullName | Measure-Object -Line).Lines

    # 1. Frontmatter YAML
    if ($Content -notmatch '^---[\r\n]') {
        Add-Result $Name 'ERROR' 'Frontmatter ausente' 'Arquivo deve começar com ---'
    } else {
        # Extrair frontmatter
        if ($Content -match '^---[\r\n](.*?)[\r\n]---') {
            $Fm = $matches[1]
            # Verificar campos obrigatórios
            $Required = @('description', 'mode', 'permission')
            foreach ($Field in $Required) {
if ($Fm -notmatch "$Field\s*:") {
                Add-Result $Name 'WARN' "Campo '$Field' ausente no frontmatter" "Recomendado: ${Field}: valor"
            }
            }
        }
    }

    # 2. Matriz de versão (para agents de dev)
    $DevAgents = @('java-senior-dev', 'spring-boot-architect', 'python-senior-dev', 'csharp-dotnet-dev', 'nodejs-backend-dev', 'frontend-nextjs-dev', 'ui-dev', 'designer-ui', 'graphql-dev', 'kubernetes-dev', 'terraform-dev', 'websocket-dev')
    if ($DevAgents -contains $Name.Replace('.md','')) {
        if ($Content -notmatch 'Matriz de (Features|Versões|Features|Version)') {
            Add-Result $Name 'WARN' 'Matriz de versão ausente' 'Agents de dev devem ter tabela de features por versão'
        }
    }

    # 3. Checklist de implementação
    if ($Content -notmatch 'Checklist de Implementa') {
        Add-Result $Name 'WARN' 'Checklist de implementação ausente' 'Recomendado: seção "## Checklist de Implementação"'
    }

    # 4. Anti-patterns section
    if ($Content -notmatch 'Anti-patterns') {
        Add-Result $Name 'WARN' 'Seção Anti-patterns ausente' 'Recomendado: seção "## Anti-patterns"'
    }

    # 5. Output Esperado
    if ($Content -notmatch 'Output Esperado') {
        Add-Result $Name 'WARN' 'Seção Output Esperado ausente' 'Recomendado: seção "## Output Esperado"'
    }

    # 6. Regras
    if ($Content -notmatch '## Regras') {
        Add-Result $Name 'WARN' 'Seção Regras ausente' 'Recomendado: seção "## Regras"'
    }

    # 7. Markdown válido - verificar headers balanceados
    $Headers = [regex]::Matches($Content, '^#{1,6}\s+.+$', 'Multiline')
    $HeaderLevels = $Headers | ForEach-Object { $_.Value -match '^(#+)' ; $matches[1].Length }
    $Prev = 0
    foreach ($Level in $HeaderLevels) {
        if ($Level -gt $Prev + 1) {
            Add-Result $Name 'WARN' "Header pula nível (h$Prev → h$Level)" "Use sequência h1→h2→h3"
        }
        $Prev = $Level
    }

    # 8. Tamanho mínimo
    if ($Lines -lt 50) {
        Add-Result $Name 'WARN' "Agent muito curto ($Lines linhas)" "Considere expandir com mais detalhes"
    }

    # 9. Verificar se é stub (4 linhas = stub antigo)
    if ($Lines -le 6) {
        Add-Result $Name 'ERROR' "Possível stub não internalizado ($Lines linhas)" "Deve ter conteúdo completo, não referência ao node_modules"
    }
}

# Summary
Write-Host "`n=== RESUMO ===" -ForegroundColor Green
Write-Host "Agents validados: $($Files.Count)" -ForegroundColor Cyan
Write-Host "Erros: $Errors" -ForegroundColor Red
Write-Host "Avisos: $Warnings" -ForegroundColor Yellow

if ($Errors -gt 0) {
    Write-Host "`nERROS:" -ForegroundColor Red
    $Results | Where-Object { $_.Level -eq 'ERROR' } | ForEach-Object {
        Write-Host "  [$($_.File)] $($_.Message) - $($_.Detail)" -ForegroundColor Red
    }
}

if ($Warnings -gt 0 -and $Strict) {
    Write-Host "`nAVISOS (strict mode):" -ForegroundColor Yellow
    $Results | Where-Object { $_.Level -eq 'WARN' } | ForEach-Object {
        Write-Host "  [$($_.File)] $($_.Message) - $($_.Detail)" -ForegroundColor Yellow
    }
} elseif ($Warnings -gt 0) {
    Write-Host "`nAvisos: $Warnings (use -Strict para detalhes)" -ForegroundColor Yellow
}

if ($OutputJson) {
    $Results | ConvertTo-Json -Depth 3 | Out-File "validation-report.json" -Encoding utf8
    Write-Host "`nRelatório JSON salvo em validation-report.json" -ForegroundColor Green
}

exit $Errors