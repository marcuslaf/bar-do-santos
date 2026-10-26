# AGENTS.md — restaurante-pedidos

## Stack Principal
- **Frontend:** Next.js 15 + React 19 + TS 5.6
- **Backend:** Supabase (Edge Functions + Postgres)
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth
- **CI/CD:** supabase-cicd-pipeline-implementer + github-actions-dev
- **Package Manager:** pnpm (preferencialmente), npm
- **Runtime:** Node.js 22+, Docker

## Descrição
Bloco de notas de pedidos para pequeno restaurante: mobile-first, login de equipe, valor opcional por nota e fechamento de caixa.

## Convenções de Código
- **Naming:** camelCase para variaveis/funcoes, PascalCase para componentes/classes, snake_case para colunas SQL
- **Imports:** Usar @/ path aliases (configurado em tsconfig)
- **Estilo:** Sempre usar const > let. Nunca var.
- **Components:** Functional components com hooks. Sem class components.
- **SQL:** Lowercase para keywords, timestamptz para datas, plural para tabelas
- **Commits:** Conventional Commits (feat:, fix:, chore:, refactor:, test:, docs:)

## Comandos Essenciais
\\\ash
# Dev
pnpm dev              # Iniciar dev server
pnpm build            # Build de producao
pnpm lint             # Verificar lint
pnpm typecheck        # Verificar tipos
pnpm test             # Rodar testes unitarios
pnpm test:e2e         # Rodar testes E2E

# Docker
docker compose up -d  # Subir stack local
docker compose down   # Parar stack

# Validacao agents
.\scripts\validate-agents.ps1
\\\

## Regras de Seguranca
- NUNCA logar ou expor chaves de API, tokens JWT, ou secrets
- NUNCA commitar .env, .env.local, ou arquivos com credenciais
- Sempre usar variaveis de ambiente para configuracao sensivel
- Validar input do usuario em toda camada (client + server)

## Fluxo de Trabalho Automático
- Após cada alteração no código, **executar automaticamente**:
  1. \git add <arquivos modificados>\ + \git commit -m "tipo: descrição"\
  2. **Perguntar** se deseja fazer push para o repositório
  3. **Perguntar** se deseja fazer deploy
- **Não esperar o usuário lembrar** — fazer como parte natural da entrega
- Seguir Conventional Commits (feat:, fix:, refactor:, chore:)

## Memória entre Sessões (MCP Memory)
- Ao finalizar cada projeto/tarefa, salvar automaticamente no MCP memory:
  - **Entidade:** nome do projeto com type \projeto\
  - **Observações:** stack usada, features implementadas, URL de deploy, repositório GitHub
  - **Relações:** conectar entidades relacionadas (ex: \projeto_X → tecnologias → Next.js\)
- No início de cada novo projeto, consultar o memory graph primeiro
- Usar \memory_create_entities\ + \memory_create_relations\ para persistir contexto

## Referencias
- Agents locais: \.agents/rules/\
- Roteamento: \AGENTS-ROUTING.md\
- Validação: \scripts/validate-agents.ps1\
