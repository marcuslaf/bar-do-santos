# Matriz de Roteamento de Agentes

> **Quando usar qual agente?** Guia de decisao para o orquestrador delegar trabalho ao especialista correto.

## Agentes de Desenvolvimento

| Agente | Stack | Quando usar | Nao usar para |
|--------|-------|-------------|---------------|
| `java-senior-dev` | Java 21, Spring Boot 3, JPA, Flyway, Spring Security 6, JUnit 5 | Implementar features, corrigir bugs, refatorar codigo Java | Decisoes arquiteturais (→ spring-boot-architect) |
| `spring-boot-architect` | Spring Boot 3.x, Spring Security 6, Micrometer, modular monolith | Desenhar arquitetura, decidir camadas, transacoes, seguranca, cache | Implementacao detalhada (→ java-senior-dev) |
| `python-senior-dev` | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 | Criar APIs Python, endpoints FastAPI, modelos Pydantic, scripts, corrigir bugs Python | Decisoes arquiteturais complexas |
| `csharp-dotnet-dev` | .NET 8+, ASP.NET Core Minimal APIs, EF Core 8, xUnit | Criar APIs C#, endpoints Minimal API, queries EF Core | Decisoes arquiteturais complexas |
| `nodejs-backend-dev` | Node.js 22+, TypeScript, Hono/Fastify, Drizzle/Prisma, Zod, JWT | Criar APIs Node.js tipadas, OpenAPI + types compartilhados | Decisoes arquiteturais complexas |
| `frontend-nextjs-dev` | Next.js App Router, React, TypeScript, Tailwind, shadcn/ui | Implementar paginas, componentes funcionais, fluxos de dados | Design visual/UI (→ designer-ui, ui-dev) |
| `ui-dev` | React, Tailwind CSS, shadcn/ui, design system | Criar/modificar componentes de UI, paginas, layouts visuais | Logica de negocio complexa (→ frontend-nextjs-dev) |

## Agentes de Banco de Dados

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `db-migrator` | PostgreSQL, Flyway, Liquibase, Supabase migrations | Criar/alterar tabelas, gerar migrations SQL, versionar schema | RLS policies (→ supabase-rls-writer) |
| `supabase-migration-writer` | Supabase, PostgreSQL, RLS | Gerar migrations Supabase com GRANT+RLS granular | DML pura (seed data) |
| `supabase-rls-writer` | Supabase, PostgreSQL RLS | Gerar policies RLS granulares por operacao | Criar tabelas (→ supabase-migration-writer) |
| `supabase-architect` | Supabase, PostgreSQL, Realtime, Storage | Projetar schema + RLS + realtime antes da primeira migration | Escrever codigo/migrations (→ supabase-migration-writer) |
| `supabase-column-privileges-writer` | Supabase, PostgreSQL | Column-level GRANTs, security_admin roles | Row-level policies (→ supabase-rls-writer) |
| `supabase-roles-implementer` | Supabase, PostgreSQL | Custom Postgres roles, service accounts, BYPASSRLS | App-level RBAC (→ supabase-custom-claims-rbac) |
| `supabase-postgres-roles` | Supabase, PostgreSQL | Postgres roles para BI, ETL, cron, admin | End-user roles (→ supabase-custom-claims-rbac) |

## Agentes Supabase (Edge Functions, Auth, Storage, Realtime)

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `supabase-edge-fn-writer` | Deno 2026, npm:/jsr: imports | Criar Edge Functions Supabase | Backend tradicional (→ nodejs-backend-dev) |
| `supabase-edge-fn-tester` | Deno, Playwright | Testar Edge Functions | Unit tests (→ test-writer) |
| `supabase-auth-bootstrapper` | Next.js, @supabase/ssr | Setup Auth SSR Next.js v16+ | Auth custom (→ nodejs-backend-dev) |
| `supabase-auth-hook-writer` | Deno, Auth Hooks | Custom Access Token Hook, MFA | Auth padrão (→ supabase-auth-bootstrapper) |
| `supabase-realtime-implementer` | Realtime, Broadcast, Presence | Canais realtime, private:true, broadcast | Polling/REST (→ frontend-nextjs-dev) |
| `supabase-storage-implementer` | Storage, Buckets, Signed URLs, TUS | Upload/download, image transforms, multi-tenant | Static assets (→ CDN) |
| `supabase-mfa-implementer` | Supabase Auth, MFA | TOTP, SMS, Email MFA | Auth simples (→ supabase-auth-bootstrapper) |
| `supabase-oauth-server-implementer` | OAuth 2.0, OIDC | OAuth server, PKCE, client credentials | Client-only OAuth (→ supabase-auth-bootstrapper) |
| `supabase-social-auth-implementer` | OAuth providers | Google, GitHub, Apple, Azure AD login | Email/password only (→ supabase-auth-bootstrapper) |
| `supabase-third-party-auth-implementer` | SAML, SSO, Enterprise | Enterprise SSO, SAML 2.0 | OAuth social (→ supabase-social-auth-implementer) |
| `supabase-sso-saml-architect` | SAML 2.0, SSO | Arquitetura SSO enterprise | OAuth (→ supabase-oauth-server-implementer) |

## Agentes de Qualidade e Auditoria

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `code-reviewer` | Qualquer stack | Revisar PRs, diffs, arquivos antes de merge | Revisar estilo visual de UI (→ designer-ui) |
| `debugger` | Qualquer stack | Investigar bugs com metodo cientifico, encontrar causa raiz | Bugs triviais (1 arquivo, erro obvio) |
| `refactorer` | Qualquer stack | Refatorar codigo existente sem alterar comportamento | Mudar comportamento (→ dev especifico) |
| `refactor-safety-auditor` | Qualquer stack | Auditar arquivo antes de refactor (gate GO/BLOCK/WARN) | Refactor em si (→ refactorer) |
| `test-writer` | Vitest, JUnit 5, pytest, Playwright | Escrever testes unitarios, integracao, E2E | Testes de RLS pura (→ pgtap) |
| `frontend-e2e-tester` | Playwright, Next.js, B2B multi-tenant | Gerar specs E2E para jornadas B2B (login, invite, org-switch, RBAC) | Unit de componente (→ RTL/Vitest) |
| `app-security-auditor` | Qualquer stack | Auditar seguranca de app (SSRF, injection, OWASP Top 10) | RLS/cross-tenant (→ multi-tenant-isolation-auditor) |
| `multi-tenant-isolation-auditor` | Supabase, PostgreSQL | Auditar RLS, cross-tenant leaks, tenant isolation | App security (→ app-security-auditor) |
| `auditor-consistencia-isolamento` | PostgreSQL | Race conditions, lost update, write skew | RLS (→ multi-tenant-isolation-auditor) |
| `release-pipeline-auditor` | GitHub Actions, CI/CD | Auditar hermeticidade, reproducibility, policy enforcement | Code review (→ code-reviewer) |
| `dependency-auditor` | Qualquer stack | Auditar dependencias, CVEs, license compliance | Code review (→ code-reviewer) |
| `nyquist-auditor` | Sistemas distribuidos | Sample rate, aliasing, observability gaps | App security (→ app-security-auditor) |
| `observability-coverage-auditor` | Qualquer stack | 4 golden signals, SLI/SLO coverage | Release audit (→ release-pipeline-auditor) |
| `observability-instrumenter` | Qualquer stack | Auto-instrumentacao OpenTelemetry, metrics, traces | Manual instrumentation (→ observability-coverage-auditor) |
| `golden-signals-instrumenter` | Qualquer stack | Latency, traffic, errors, saturation | Observability audit (→ observability-coverage-auditor) |
| `slo-engineer` | Qualquer stack | SLI/SLO/SLA definition, error budgets | Observability audit (→ observability-coverage-auditor) |
| `incident-investigator` | Qualquer stack | Postmortem, root cause, timeline reconstruction | Debugging (→ debugger) |
| `postmortem-writer` | Qualquer stack | Blameless postmortem, action items tracking | Incident response (→ incident-investigator) |
| `toil-auditor` | Qualquer stack | Detectar toil (manual, repetitive, automatable) | Code review (→ code-reviewer) |
| `llm-eval-harness-writer` | LLM apps | Evaluation harness, benchmarks, regression tests | Unit tests (→ test-writer) |
| `ai-mutation-tester` | Qualquer stack | Mutation testing, test quality validation | Unit tests (→ test-writer) |
| `example-reviewer` | Qualquer stack | Review exemplos, documentation, tutorials | Code review (→ code-reviewer) |
| `verifier` | Qualquer stack | Verification gates, acceptance criteria | Code review (→ code-reviewer) |

## Agentes de Segurança e Compliance

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `app-security-auditor` | Qualquer stack | SSRF, injection, OWASP Top 10, secrets scan | RLS/cross-tenant (→ multi-tenant-isolation-auditor) |
| `multi-tenant-isolation-auditor` | Supabase, PostgreSQL | RLS, cross-tenant leaks, tenant isolation | App security (→ app-security-auditor) |
| `auditor-consistencia-isolamento` | PostgreSQL | Race conditions, isolation levels | RLS (→ multi-tenant-isolation-auditor) |
| `lgpd-compliance-auditor` | Qualquer stack | LGPD/GDPR compliance, data mapping, DPIA | App security (→ app-security-auditor) |
| `supabase-rls-hardener` | Supabase, PostgreSQL | Defense-in-depth RLS, security_invoker views | Basic RLS (→ supabase-rls-writer) |
| `supabase-rls-defense-in-depth` | Supabase, PostgreSQL | Advanced RLS patterns, security_invoker | Basic RLS (→ supabase-rls-writer) |
| `supabase-auth-hardening` | Supabase Auth | Auth security, brute force, session management | Basic auth (→ supabase-auth-bootstrapper) |
| `supabase-column-level-security` | Supabase, PostgreSQL | Column-level policies, security labels | Row-level (→ supabase-rls-writer) |

## Agentes de Arquitetura e Planejamento

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `supabase-architect` | Supabase, PostgreSQL, Realtime, Storage | Projetar schema + RLS + realtime antes da primeira migration | Escrever codigo/migrations (→ supabase-migration-writer) |
| `supabase-branching-architect` | Supabase, GitHub | Preview/persistent branches, cost alerts | Non-Supabase (→ arquiteto generico) |
| `b2b-saas-architect` | Multi-tenant, PostgreSQL | Org→Dept→Role→Permission, JWT minimal | Single-tenant (→ arquiteto generico) |
| `supabase-cicd-pipeline-implementer` | Supabase, GitHub Actions | 8 workflows canônicos + 6 secrets | Non-Supabase (→ github-actions-dev) |
| `supabase-migration-repair` | Supabase, PostgreSQL | Schema drift, rebase, migration order | New migrations (→ supabase-migration-writer) |
| `supabase-config-toml-remotes` | Supabase, dotenvx | Secret strategy, encrypted commits | Plain env vars (→ supabase-cicd-pipeline-implementer) |
| `supabase-pgtap-testing` | PostgreSQL, pgTAP | Schema, RLS, PG functions testing | Unit tests (→ test-writer) |
| `supabase-pgvector-rag` | Supabase, pgvector | RAG, embeddings, vector search | Traditional search (→ supabase-realtime-implementer) |
| `supabase-query-performance-tuner` | PostgreSQL | Index tuning, explain analyze, pg_stat_statements | Schema design (→ supabase-architect) |
| `supabase-cron-queues` | PostgreSQL, pg_cron, pgmq | Background jobs, scheduled tasks | External queues (→ supabase-edge-fn-writer) |
| `supabase-declarative-schema` | Supabase, SQL | Declarative schema, db diff, migrations | Imperative (→ supabase-migration-writer) |
| `supabase-database-functions` | PostgreSQL | SECURITY INVOKER, search_path, IMMUTABLE/STABLE | Edge Functions (→ supabase-edge-fn-writer) |
| `supabase-custom-claims-rbac` | Supabase Auth | Custom Claims, app_role, user_roles | Postgres roles (→ supabase-roles-implementer) |
| `supabase-jwt-signing-keys` | Supabase Auth | JWKS, key rotation, token signing | Default keys (→ supabase-auth-bootstrapper) |
| `supabase-enterprise-sso-saml` | SAML 2.0, SSO | Enterprise SSO architecture | OAuth (→ supabase-oauth-server-implementer) |
| `supabase-mfa` | Supabase Auth | TOTP, recovery codes, backup codes | Basic auth (→ supabase-auth-bootstrapper) |
| `supabase-rag-implementer` | pgvector, Edge Functions | RAG pipeline, embeddings, retrieval | Traditional search (→ supabase-realtime-implementer) |
| `supabase-realtime` | Realtime, Broadcast, Presence | Channels, private:true, naming scope:entity:id | Polling (→ frontend-nextjs-dev) |
| `supabase-storage` | Storage, Buckets, Signed URLs | Public/private buckets, transforms, TUS | Static assets (→ CDN) |

## Agentes de Implementação Específica (Implementers)

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `invite-flow-implementer` | Supabase, Next.js | Member invite, token SHA-256, state machine | Generic invites (→ frontend-nextjs-dev) |
| `org-onboarding-implementer` | Supabase, Next.js | Org + first admin atomic, slug immutable | Generic signup (→ frontend-nextjs-dev) |
| `member-management-react-shadcn` | React, shadcn/ui, TanStack | Member panel, data-table, invite dialog, role dropdown | Generic UI (→ ui-dev) |
| `member-invite-flow` | Supabase, Next.js | Token SHA-256, pending/accepted/expired, email-locked | Generic invites (→ invite-flow-implementer) |
| `org-switcher-react-pattern` | Next.js, Zustand v5 | URL /orgs/[slug]/, JWT refresh, RLS validated | Single-org (→ frontend-nextjs-dev) |
| `permission-gate-react-pattern` | React, shadcn/ui | PermissionGate por acao, UX-only, server enforcement | Server-only (→ backend dev) |
| `crm-pipeline-implementer` | Supabase, Next.js | Lead pipeline, stages, Kanban, automation | Generic CRM (→ frontend-nextjs-dev) |
| `billing-implementer` | Stripe, Supabase | Subscriptions, webhooks, portal, invoices | Generic payments (→ nodejs-backend-dev) |
| `audit-log-implementer` | Supabase, PostgreSQL | Audit triggers, tenant_id, user_id, op, old/new row | Generic logging (→ nodejs-backend-dev) |
| `super-admin-implementer` | Supabase, Next.js | Platform admin, cross-tenant, impersonation | Tenant admin (→ member-management-react-shadcn) |
| `detector-tenant-quente` | Supabase, PostgreSQL | Hot tenant detection, mitigation, alerting | Monitoring (→ golden-signals-instrumenter) |
| `evolution-go-integrator` | Go, WhatsApp | WhatsApp Business API integration | Other integrations (→ nodejs-backend-dev) |
| `invite-flow-implementer` | Supabase, Next.js | Member invite flow, token management | Generic invites (→ frontend-nextjs-dev) |

## Agentes de Dados e Migração

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `supabase-migration-writer` | Supabase, PostgreSQL, RLS | Migrations com GRANT+RLS granular, declarative schema | DML pura (seed data) |
| `supabase-rls-writer` | Supabase, PostgreSQL RLS | Policies granulares, GRANTs antes ENABLE RLS | Criar tabelas (→ supabase-migration-writer) |
| `validador-evolucao-schema` | PostgreSQL | Validar NOT NULL, drop column, narrow type | New migrations (→ supabase-migration-writer) |
| `supabase-migration-repair` | Supabase, PostgreSQL | Schema drift, rebase, migration order | New migrations (→ supabase-migration-writer) |
| `supabase-declarative-schema` | Supabase, SQL | Declarative schema, db diff, migrations | Imperative (→ supabase-migration-writer) |
| `supabase-database-functions` | PostgreSQL | SECURITY INVOKER, search_path, IMMUTABLE/STABLE | Edge Functions (→ supabase-edge-fn-writer) |
| `supabase-postgres-style` | PostgreSQL | snake_case, lowercase, plural tables, timestamptz | Other DBs (→ db-migrator) |
| `postgresql` | PostgreSQL | Design, indexing, constraints, performance | Other DBs (→ db-migrator) |
| `postgresql-optimization` | PostgreSQL | Query tuning, indexing, pg_stat_statements | Schema design (→ supabase-architect) |
| `postgres-isolamento-concorrencia` | PostgreSQL | Isolation levels, MVCC, locking | App-level (→ auditor-consistencia-isolamento) |
| `consistencia-leitura-replica` | PostgreSQL | Read replicas, eventual consistency | Primary only (→ supabase-architect) |
| `escolha-modelo-consistencia` | PostgreSQL | Linearizabilidade, causal, eventual | App-level (→ supabase-architect) |
| `evolucao-schema-compativel` | PostgreSQL | 3-step pattern, backward compatible | Breaking changes (→ validador-evolucao-schema) |

## Agentes de Observabilidade e SRE

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `golden-signals-instrumenter` | Qualquer stack | Latency, traffic, errors, saturation | Observability audit (→ observability-coverage-auditor) |
| `observability-instrumenter` | Qualquer stack | Auto-instrumentacao OpenTelemetry | Manual (→ observability-coverage-auditor) |
| `observability-coverage-auditor` | Qualquer stack | 4 golden signals, SLI/SLO coverage | Release audit (→ release-pipeline-auditor) |
| `slo-engineer` | Qualquer stack | SLI/SLO/SLA, error budgets | Observability audit (→ observability-coverage-auditor) |
| `incident-investigator` | Qualquer stack | Postmortem, root cause, timeline | Debugging (→ debugger) |
| `postmortem-writer` | Qualquer stack | Blameless postmortem, action items | Incident response (→ incident-investigator) |
| `toil-auditor` | Qualquer stack | Detectar toil (manual, repetitive, automatable) | Code review (→ code-reviewer) |
| `burn-rate-forecaster` | Qualquer stack | Cost forecasting, budget alerts | Capacity planning (→ slo-engineer) |
| `cascading-failures-auditor` | Distributed systems | Failure domains, blast radius | Incident response (→ incident-investigator) |
| `nyquist-auditor` | Distributed systems | Sample rate, aliasing, observability gaps | App security (→ app-security-auditor) |
| `observability-coverage-auditor` | Qualquer stack | 4 golden signals, SLI/SLO coverage | Release audit (→ release-pipeline-auditor) |
| `observability-instrumenter` | Qualquer stack | Auto-instrumentacao OpenTelemetry | Manual (→ observability-coverage-auditor) |
| `slo-engineer` | Qualquer stack | SLI/SLO/SLA, error budgets | Observability audit (→ observability-coverage-auditor) |
| `release-pipeline-auditor` | GitHub Actions, CI/CD | Hermeticidade, reproducibility, policy | Code review (→ code-reviewer) |
| `release-engineering` | Qualquer stack | Deployment philosophy, strategies | CI/CD (→ github-actions-dev) |
| `deployment-procedures` | Qualquer stack | Safe deployment, rollback, verification | CI/CD (→ github-actions-dev) |
| `hermetic-builds` | Qualquer stack | Reproducibility, actions pinned + lockfile | CI/CD (→ github-actions-dev) |
| `eliminating-toil` | Qualquer stack | Automate manual repetitive tasks | Code review (→ code-reviewer) |
| `load-shedding-instrumenter` | Qualquer stack | Graceful degradation, rate limiting | App security (→ app-security-auditor) |
| `load-shedding-graceful-degradation` | Qualquer stack | Circuit breaker, bulkhead, timeout | App security (→ app-security-auditor) |
| `retry-strategies` | Qualquer stack | Exponential backoff, idempotency keys | App security (→ app-security-auditor) |
| `structured-events` | Qualquer stack | Canonical event attributes, result.success | Observability (→ observability-instrumenter) |
| `telemetry-pipelines` | Qualquer stack | OTel collectors, processors, exporters | Observability (→ observability-instrumenter) |
| `telemetry-sampling` | Qualquer stack | Head/tail sampling, cost control | Observability (→ telemetry-pipelines) |
| `distributed-tracing` | Qualquer stack | Trace context, baggage, W3C | Observability (→ observability-instrumenter) |
| `core-analysis-loop` | Qualquer stack | OODA loop, hypothesis-driven debugging | Debugging (→ debugger) |
| `four-golden-signals` | Qualquer stack | Latency, traffic, errors, saturation | Observability (→ golden-signals-instrumenter) |
| `event-based-slos` | Qualquer stack | Event-based SLI/SLO, burn rate | SLO engineering (→ slo-engineer) |
| `blameless-postmortems` | Qualquer stack | Postmortem culture, action items | Incident response (→ postmortem-writer) |
| `production-readiness-review` | Qualquer stack | 6 axes PRR, engagement models | Release audit (→ release-pipeline-auditor) |
| `prr-conductor` | Qualquer stack | Conduct PRR, 6 axes, evidence-based | Release audit (→ release-pipeline-auditor) |

## Agentes de Design e UI

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `designer-ui` | React, Tailwind, shadcn/ui | Design system, auditoria visual, MARCA.md+DESIGN.md | Implementacao de logica (→ frontend-nextjs-dev) |
| `ui-dev` | React, Tailwind, shadcn/ui | Implementar componentes UI, design system | Design strategy (→ designer-ui) |
| `ui-auditor` | React, Tailwind, shadcn/ui | Auditoria visual, Nielsen 10, tells IA | Code review (→ code-reviewer) |
| `ui-checker` | React, Tailwind, shadcn/ui | Visual regression, accessibility, theming | Code review (→ code-reviewer) |
| `ui-researcher` | React, Tailwind, shadcn/ui | User research, usability testing, patterns | Design (→ designer-ui) |
| `ui-anti-padroes-ia` | React, Tailwind | Detectar tells IA (gradientes roxos, Inter, uppercase) | Code review (→ ui-auditor) |
| `ui-tipografia` | React, Tailwind | Display + Body + Mono, max 4 sizes x 2 weights | Design system (→ designer-ui) |
| `ui-cor-estrategia` | React, Tailwind | 60/30/10, OKLCH, WCAG AA 4.5:1, dark mode | Design system (→ designer-ui) |
| `ui-ritmo-espacial` | React, Tailwind | Base-4 scale, 3 density levels, optical alignment | Design system (→ designer-ui) |
| `ui-motion-funcional` | React, Tailwind | Motion ≤ 200ms, functional, not decorative | Design system (→ designer-ui) |
| `ui-critica-auditoria` | React, Tailwind | Nielsen 10 + cognitive load + tells IA, P0-P3 | UI audit (→ ui-auditor) |
| `ui-contexto-produto` | React, Tailwind | MARCA.md + DESIGN.md generation | Design system (→ designer-ui) |

## Agentes de Infraestrutura e CI/CD

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `dockerize` | Docker, Docker Compose | Dockerfiles, multi-stage, otimizacao, security | K8s/Terraform (→ arquiteto) |
| `github-actions-dev` | GitHub Actions, qualquer stack | CI/CD workflows, lint/test/build/deploy/security/release | K8s/Terraform (→ arquiteto) |
| `supabase-cicd-pipeline-implementer` | Supabase, GitHub Actions | 8 workflows canônicos + 6 secrets | Non-Supabase (→ github-actions-dev) |
| `workflow-generator` | GitHub Actions | Generate workflows from templates | Custom workflows (→ github-actions-dev) |
| `release-pipeline-auditor` | GitHub Actions, CI/CD | Hermeticidade, reproducibility, policy | Code review (→ code-reviewer) |
| `release-engineering` | Qualquer stack | Deployment philosophy, strategies | CI/CD (→ github-actions-dev) |
| `deployment-procedures` | Qualquer stack | Safe deployment, rollback, verification | CI/CD (→ github-actions-dev) |
| `hermetic-builds` | Qualquer stack | Reproducibility, actions pinned + lockfile | CI/CD (→ github-actions-dev) |
| `eliminating-toil` | Qualquer stack | Automate manual repetitive tasks | Code review (→ code-reviewer) |
| `cost-tracking` | Qualquer stack | Cost tracking, budget alerts | Observability (→ burn-rate-forecaster) |
| `dynamic-workflow-authoring` | GitHub Actions | Dynamic workflow generation | Static workflows (→ github-actions-dev) |

## Agentes de Legado e Refatoração

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `legacy-characterizer` | Qualquer stack | Characterization tests, behavior capture | New code (→ test-writer) |
| `legacy-characterization-tests` | Qualquer stack | Behavioral coverage thresholds | New code (→ test-writer) |
| `legacy-effect-analysis` | Qualquer stack | Impact analysis, dependency mapping | New code (→ refactorer) |
| `legacy-extract-class` | Qualquer stack | Extract class, single responsibility | New code (→ refactorer) |
| `legacy-monster-methods` | Qualquer stack | Decompose large methods | New code (→ refactorer) |
| `legacy-programming-by-difference` | Qualquer stack | Incremental refactoring | New code (→ refactorer) |
| `legacy-seams-and-test-harness` | Qualquer stack | Find seams, test harness setup | New code (→ refactorer) |
| `legacy-shotgun-surgery` | Qualquer stack | Detect scattered changes | New code (→ refactorer) |
| `legacy-sprout-wrap-techniques` | Qualquer stack | Sprout method, wrap method | New code (→ refactorer) |
| `legacy-storytelling-naked-crc` | Qualquer stack | CRC cards, storytelling refactor | New code (→ refactorer) |
| `legacy-api-only-applications` | Qualquer stack | Legacy API characterization | New APIs (→ backend dev) |
| `legacy-api-only-applications` | Qualquer stack | Legacy API only apps | New code (→ backend dev) |
| `pre-refactor-characterization` | Qualquer stack | Pre-refactor gate criteria | New code (→ refactor-safety-auditor) |
| `refactor-safety-auditor` | Qualquer stack | Pre-refactor gate GO/BLOCK/WARN | Refactor itself (→ refactorer) |
| `refactorer` | Qualquer stack | Safe refactoring, extraction techniques | New code (→ dev especifico) |
| `seam-finder` | Qualquer stack | Find seams for dependency breaking | New code (→ refactorer) |
| `shotgun-surgery-detector` | Qualquer stack | Detect scattered changes | New code (→ refactorer) |
| `storytelling-analyst` | Qualquer stack | CRC cards, storytelling refactor | New code (→ refactorer) |
| `ai-prompt-characterization` | Qualquer stack | Prompt characterization for LLM | New code (→ test-writer) |
| `llm-as-dependency` | Qualquer stack | LLM as external dependency | New code (→ backend dev) |

## Agentes de Planejamento e Gestão

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `planner` | Qualquer stack | Phase planning, task breakdown | Ad-hoc tasks (→ executor) |
| `executor` | Qualquer stack | Execute PLAN.md, atomic commits | Planning (→ planner) |
| `roadmapper` | Qualquer stack | Roadmap, milestones, dependencies | Sprint planning (→ planner) |
| `project-researcher` | Qualquer stack | Research, feasibility, tech selection | Implementation (→ dev especifico) |
| `phase-researcher` | Qualquer stack | Phase-specific research | General research (→ project-researcher) |
| `research-synthesizer` | Qualquer stack | Synthesize research, trade-offs | Decision making (→ planner) |
| `direction-prospector` | Qualquer stack | Strategic direction, alternatives | Planning (→ planner) |
| `plan-checker` | Qualquer stack | Validate plan completeness, risks | Execution (→ executor) |
| `verifier` | Qualquer stack | Verification gates, acceptance criteria | Code review (→ code-reviewer) |
| `integration-checker` | Qualquer stack | Integration validation, contracts | Unit tests (→ test-writer) |
| `schema-checker` | Qualquer stack | Schema validation, compatibility | Migration (→ validador-evolucao-schema) |
| `validador-evolucao-schema` | PostgreSQL | NOT NULL, drop column, narrow type | New migrations (→ supabase-migration-writer) |
| `commit-pr-conductor` | Git, GitHub | Conventional commits, PR management | Manual git (→ git-advanced-workflows) |
| `git-advanced-workflows` | Git | Rebase, cherry-pick, bisect, worktrees | Basic git (→ commit-pr-conductor) |
| `workflow-generator` | GitHub Actions | Generate workflows from templates | Custom workflows (→ github-actions-dev) |
| `dynamic-workflow-authoring` | GitHub Actions | Dynamic workflow generation | Static workflows (→ github-actions-dev) |
| `cost-tracking` | Qualquer stack | Cost tracking, budget alerts | Observability (→ burn-rate-forecaster) |
| `dynamic-workflow-authoring` | GitHub Actions | Dynamic workflow generation | Static workflows (→ github-actions-dev) |

## Agentes de Autenticação e Autorização

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `supabase-auth-methods` | Supabase Auth | Password, magic link, OTP, anonymous, Web3 | Custom auth (→ nodejs-backend-dev) |
| `supabase-auth-sessions` | Supabase Auth | PKCE vs implicit, JWT expiry, refresh reuse | Session mgmt (→ supabase-auth-bootstrapper) |
| `supabase-auth-ssr` | Next.js, @supabase/ssr | Browser/server client, middleware, getClaims | Non-Next.js (→ supabase-auth-bootstrapper) |
| `supabase-custom-claims-rbac` | Supabase Auth | Custom Claims, app_role, user_roles | Postgres roles (→ supabase-roles-implementer) |
| `supabase-mfa` | Supabase Auth | TOTP, recovery codes, backup codes | Basic auth (→ supabase-auth-bootstrapper) |
| `supabase-auth-hardening` | Supabase Auth | Brute force, session management, security | Basic auth (→ supabase-auth-bootstrapper) |
| `supabase-jwt-signing-keys` | Supabase Auth | JWKS, key rotation, token signing | Default keys (→ supabase-auth-bootstrapper) |
| `supabase-enterprise-sso-saml` | SAML 2.0, SSO | Enterprise SSO architecture | OAuth (→ supabase-oauth-server-implementer) |
| `supabase-social-oauth` | OAuth providers | Google, GitHub, Apple, Azure AD | Enterprise SSO (→ supabase-enterprise-sso-saml) |
| `supabase-third-party-auth` | OAuth providers | Social login providers | Enterprise SSO (→ supabase-enterprise-sso-saml) |
| `supabase-oauth-server-implementer` | OAuth 2.0, OIDC | OAuth server, PKCE, client credentials | Client-only (→ supabase-auth-bootstrapper) |
| `supabase-social-auth-implementer` | OAuth providers | Social login implementation | Enterprise SSO (→ supabase-enterprise-sso-saml) |
| `supabase-sso-saml-architect` | SAML 2.0, SSO | Enterprise SSO architecture | OAuth (→ supabase-oauth-server-implementer) |
| `rbac-permissions-matrix-supabase` | Supabase Auth | resource:action, roles↔permissions matrix | Postgres roles (→ supabase-roles-implementer) |
| `multi-tenant-rls-hierarchy` | Supabase, PostgreSQL | org→dept→role→permission, super_admin bypass | Single-tenant (→ supabase-architect) |
| `supabase-roles-implementer` | Supabase, PostgreSQL | Custom Postgres roles, service accounts | App-level RBAC (→ supabase-custom-claims-rbac) |
| `supabase-postgres-roles` | Supabase, PostgreSQL | Postgres roles for BI, ETL, cron, admin | End-user roles (→ supabase-custom-claims-rbac) |
| `supabase-column-level-security` | Supabase, PostgreSQL | Column-level policies, security labels | Row-level (→ supabase-rls-writer) |
| `supabase-rls-defense-in-depth` | Supabase, PostgreSQL | Advanced RLS, security_invoker views | Basic RLS (→ supabase-rls-writer) |
| `supabase-rls-hardener` | Supabase, PostgreSQL | Defense-in-depth RLS, security_invoker | Basic RLS (→ supabase-rls-writer) |
| `supabase-rls-policies` | Supabase, PostgreSQL | GRANT antes ENABLE RLS, (select auth.uid()) | App-level (→ supabase-rls-writer) |
| `supabase-rls-policies` | Supabase, PostgreSQL | 4 policies granulares, IS NOT NULL, indexes | App-level (→ supabase-rls-writer) |

## Agentes de Testes e Qualidade

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `test-writer` | Vitest, JUnit 5, pytest, Playwright | Unit, integration, E2E tests | RLS tests (→ supabase-pgtap-testing) |
| `frontend-e2e-tester` | Playwright, Next.js, B2B | E2E specs: login, invite, org-switch, RBAC | Unit tests (→ test-writer) |
| `supabase-pgtap-testing` | PostgreSQL, pgTAP | Schema, RLS, PG functions testing | Unit tests (→ test-writer) |
| `supabase-edge-fn-tester` | Deno, Playwright | Edge Functions testing | Unit tests (→ test-writer) |
| `llm-eval-harness-writer` | LLM apps | Evaluation harness, benchmarks | Unit tests (→ test-writer) |
| `ai-mutation-tester` | Qualquer stack | Mutation testing, test quality | Unit tests (→ test-writer) |
| `example-reviewer` | Qualquer stack | Review examples, documentation | Code review (→ code-reviewer) |
| `verifier` | Qualquer stack | Verification gates, acceptance criteria | Code review (→ code-reviewer) |

## Agentes de Utilidades e Especializados

| Agente | Stack | Quando usar | Quando nao usar |
|--------|-------|-------------|-----------------|
| `api-contract-designer` | Qualquer stack | OpenAPI/GraphQL contract design | Implementation (→ backend dev) |
| `api-doc-writer` | Qualquer stack | API documentation, examples | Contract design (→ api-contract-designer) |
| `api-design-principles` | Qualquer stack | REST/GraphQL/tRPC principles | Contract design (→ api-contract-designer) |
| `api-patterns` | Qualquer stack | REST vs GraphQL vs tRPC selection | Contract design (→ api-contract-designer) |
| `api-security-best-practices` | Qualquer stack | Auth, validation, rate limiting | Implementation (→ backend dev) |
| `database-design` | Qualquer stack | Schema design, indexing, ORM selection | Implementation (→ db-migrator) |
| `deployment-procedures` | Qualquer stack | Safe deployment, rollback, verification | CI/CD (→ github-actions-dev) |
| `docker-expert` | Docker, Compose | Multi-stage, optimization, security | K8s (→ arquiteto) |
| `e2e-testing-patterns` | Playwright, Cypress | E2E patterns, flaky test debugging | Unit tests (→ test-writer) |
| `git-advanced-workflows` | Git | Rebase, cherry-pick, bisect, worktrees | Basic git (→ commit-pr-conductor) |
| `github-actions-templates` | GitHub Actions | Workflow templates, reusable workflows | Custom (→ github-actions-dev) |
| `sentry-monitoring` | Next.js, React | Error tracking, performance, session replay | Observability (→ observability-instrumenter) |
| `stripe-payments` | Stripe, Next.js | Checkout, subscriptions, webhooks, portal | Generic payments (→ billing-implementer) |
| `vercel-deploy` | Vercel, Next.js | Monorepos, edge functions, env vars, domains | Other platforms (→ github-actions-dev) |
| `vitest-testing` | Vitest | Config, mocking, coverage, benchmarks | Other test runners (→ test-writer) |
| `python-pro` | Python 3.12+ | FastAPI, Pydantic v2, SQLAlchemy 2.0, async | Other Python (→ python-senior-dev) |
| `csharp-dotnet-dev` | .NET 8+ | Minimal APIs, EF Core, xUnit | Other .NET (→ csharp-dotnet-dev) |
| `java-senior-dev` | Java 21+ | Spring Boot 3, JPA, Flyway, JUnit 5 | Other Java (→ java-senior-dev) |
| `spring-boot-architect` | Spring Boot 3.x | Architecture, transactions, security, cache | Implementation (→ java-senior-dev) |
| `nodejs-backend-dev` | Node.js 22+ | Hono/Fastify, Drizzle/Prisma, Zod, JWT | Other Node.js (→ nodejs-backend-dev) |
| `frontend-nextjs-dev` | Next.js 15+ | App Router, React 19, TS 5.6, Tailwind | Other frontend (→ frontend-nextjs-dev) |
| `ui-dev` | React, Tailwind, shadcn/ui | UI components, design system | Logic (→ frontend-nextjs-dev) |
| `designer-ui` | React, Tailwind, shadcn/ui | Design system, visual audit, MARCA.md+DESIGN.md | Logic (→ frontend-nextjs-dev) |

## Arvore de Decisao por Tarefa

### "Preciso criar uma API REST"
1. Qual stack? Java → `java-senior-dev` | Python → `python-senior-dev` | C# → `csharp-dotnet-dev` | Node.js → `nodejs-backend-dev`
2. Precisa de arquitetura primeiro? → `spring-boot-architect` (Java) ou arquiteto da stack

### "Preciso criar uma tabela no banco"
1. Supabase? → `supabase-migration-writer` (migration + RLS)
2. PostgreSQL com Flyway? → `db-migrator`
3. Precisa de RLS? → `supabase-rls-writer`
4. Column-level security? → `supabase-column-privileges-writer`
5. Custom Postgres roles? → `supabase-roles-implementer`

### "Preciso criar uma tela/pagina"
1. Precisa de design primeiro? → `designer-ui` (MARCA.md + DESIGN.md)
2. Implementar UI → `ui-dev` (componentes visuais)
3. Implementar logica/dados → `frontend-nextjs-dev` (fetch, estado, fluxo)

### "Tem um bug"
1. Bug complexo/desconhecido? → `debugger` (metodo cientifico)
2. Bug simples e obvio? → desenvolvedor da stack (java-senior-dev, python-senior-dev, etc.)

### "Preciso revisar um PR"
1. Revisao de codigo → `code-reviewer`
2. Revisao de UI/visual → `designer-ui`
3. Revisao de seguranca → `app-security-auditor`

### "Preciso refatorar codigo"
1. Auditar seguranca primeiro → `refactor-safety-auditor` (gate GO/BLOCK/WARN)
2. Refatorar → `refactorer`

### "Preciso containerizar a aplicacao"
1. `dockerize` — Dockerfile + docker-compose

### "Preciso configurar CI/CD no GitHub Actions"
1. Qual stack? Qualquer → `github-actions-dev` (lint, test, build, deploy, security, release)
2. Supabase? → `supabase-cicd-pipeline-implementer` (workflows canônicos Supabase + secrets)
3. Precisa de container? → `dockerize` (Dockerfile) + `github-actions-dev` (build/push image)

### "Preciso de testes"
1. Unitarios/integracao → `test-writer`
2. E2E B2B multi-tenant → `frontend-e2e-tester`
3. Seguranca → `app-security-auditor`
4. RLS/Postgres → `supabase-pgtap-testing`
5. Edge Functions → `supabase-edge-fn-tester`

### "Preciso de autenticacao/autorizacao"
1. Supabase Auth setup → `supabase-auth-bootstrapper`
2. Custom Claims RBAC → `supabase-custom-claims-rbac`
3. MFA → `supabase-mfa-implementer`
4. OAuth/Social → `supabase-social-auth-implementer`
5. Enterprise SSO/SAML → `supabase-sso-saml-architect`
5. OAuth Server → `supabase-oauth-server-implementer`

### "Preciso de observabilidade/SRE"
1. 4 Golden Signals → `golden-signals-instrumenter`
2. SLI/SLO/Error Budgets → `slo-engineer`
3. Incident response → `incident-investigator` + `postmortem-writer`
4. Toil detection → `toil-auditor`
5. Release readiness → `prr-conductor` + `release-pipeline-auditor`

### "Preciso de Supabase especifico"
1. Schema + RLS + Realtime design → `supabase-architect`
2. Migrations + RLS → `supabase-migration-writer`
3. RLS policies granulares → `supabase-rls-writer`
4. Edge Functions → `supabase-edge-fn-writer`
5. Realtime → `supabase-realtime-implementer`
6. Storage → `supabase-storage-implementer`
7. Auth → `supabase-auth-bootstrapper`
8. CI/CD → `supabase-cicd-pipeline-implementer`
9. Branching strategy → `supabase-branching-architect`

## Regras de Ouro

1. **Nunca usar agente de design para implementar logica** — designer-ui e ui-dev sao para visual
2. **Nunca usar agente de implementacao para decidir arquitetura** — java-senior-dev implementa, spring-boot-architect decide
3. **Sempre auditar antes de refatorar** — refactor-safety-auditor antes de refactorer
4. **Sempre revisar antes de merge** — code-reviewer antes de merge
5. **Sempre testar** — test-writer apos implementacao
6. **Stack especifica importa** — Java ≠ Python ≠ React; usar agente da stack correta
7. **Supabase tem agents especificos** — nao usar agents genericos para features Supabase
6. **Legado requer caracterizacao** — refactor-safety-auditor + legacy-characterizer antes de refatorar
7. **Seguranca em camadas** — app-security-auditor (app) + multi-tenant-isolation-auditor (RLS) + supabase-rls-hardener (defense-in-depth)
7. **Observabilidade obrigatoria** — golden-signals-instrumenter + slo-engineer em todo deploy
8. **CI/CD como codigo** — github-actions-dev + hermetic-builds + release-pipeline-auditor