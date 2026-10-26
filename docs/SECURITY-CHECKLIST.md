# Security Checklist - Por Fase do Projeto

> **Regra geral:** Cada fase deve ter TODOS os itens da fase anterior + os novos.
> Se um item não se aplica ao seu stack, documente por quê.

---

## FASE 0: Fundação (Primeiro Commit)

### Git & Secrets
- [ ] `.gitignore` com padrões de secrets (usar template)
- [ ] `.env.example` com variáveis documentadas (valores placeholder)
- [ ] `.env` NUNCA commitado (verificar .gitignore)
- [ ] Nenhum secret hardcodado no código
- [ ] Chaves de API em variáveis de ambiente

### Autenticação
- [ ] Usar provider de auth pronto (Supabase Auth, Auth0, NextAuth)
- [ ] NUNCA implementar hash de senha do zero
- [ ] Senhas com mínimo 12 caracteres + complexity

### Código
- [ ] Input validation server-side (zod, pydantic, jackson)
- [ ] Nenhum `eval()` ou `exec()` com input do usuário
- [ ] Nenhum SQL dinâmico sem parameterização
- [ ] HTTPS obrigatório (mesmo em dev com mkcert)

### Banco de Dados
- [ ] Conexão com role de mínimo privilégio
- [ ] RLS habilitado em TODAS as tabelas (Supabase)
- [ ] Senhas de banco em variáveis de ambiente

---

## FASE 1: Pré-Produção

### Segurança de Transporte
- [ ] HTTPS com TLS 1.2+ (não TLS 1.0/1.1)
- [ ] HSTS habilitado (Strict-Transport-Security)
- [ ] Certificados válidos (Let's Encrypt, Vercel, Cloudflare)

### Headers de Segurança
- [ ] Content Security Policy (CSP) definido
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY ou SAMEORIGIN
- [ ] X-XSS-Protection: 0 (relying on CSP)
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy restritivo

### Autenticação Refinada
- [ ] MFA disponível para usuários
- [ ] Rate limiting em endpoints de auth
- [ ] Account lockout após N tentativas
- [ ] Session timeout configurado
- [ ] Tokens com curta duração (15min access, 7d refresh)

### Banco de Dados Avançado
- [ ] RLS policies por operação (SELECT, INSERT, UPDATE, DELETE)
- [ ] Índices em colunas usadas por RLS policies
- [ ] Audit log em tabelas sensíveis
- [ ] Backup automático configurado

### Logging & Monitoramento
- [ ] Logs estruturados (JSON)
- [ ] Nenhum PII/token em logs
- [ ] Sentry ou similar para erros
- [ ] Alertas para atividade suspeita

### Dependências
- [ ] Lockfile commitado (pnpm-lock.yaml, poetry.lock)
- [ ] `npm audit` / `pip-audit` no CI
- [ ] Dependabot ou Renovate configurado

---

## FASE 2: Produção

### Segurança Operacional
- [ ] Secrets rotation programado (90 dias)
- [ ] Disaster recovery testado
- [ ] Incident response documentado
- [ ] Contato de segurança publicado

### Infraestrutura
- [ ] WAF (Cloudflare, AWS WAF) se aplicável
- [ ] DDoS protection habilitada
- [ ] IP allowlisting para admin (se fizer sentido)
- [ ] Rate limiting global + por endpoint

### Compliance (se aplicável)
- [ ] LGPD: consentimento documentado
- [ ] LGPD: direito ao esquecimento implementado
- [ ] LGPD: DPO definido
- [ ] Dados sensíveis criptografados em repouso

### Testing
- [ ] Testes de segurança automatizados no CI
- [ ] SAST (Static Application Security Testing)
- [ ] DAST (Dynamic Application Security Testing)
- [ ] Pen test antes do launch (se dados sensíveis)

### Resiliência
- [ ] Graceful degradation configurado
- [ ] Circuit breakers em chamadas externas
- [ ] Retry com backoff exponencial
- [ ] Timeouts em todas as chamadas externas

---

## FASE 3: Escala / Enterprise

### Zero Trust
- [ ] Service mesh ou mTLS entre serviços
- [ ] RBAC granular (resource:action)
- [ ] Just-in-time access para admin
- [ ] Audit trail completo

### Advanced
- [ ] Secret rotation automático
- [ ] Key management service (KMS)
- [ ] Data classification policy
- [ ] Red team exercises
- [ ] Bug bounty program (se aplicável)

### Compliance Avançado
- [ ] SOC 2 Type II (se B2B enterprise)
- [ ] ISO 27001 (se necessário)
- [ ] PCI DSS (se processa cartões)
- [ ] HIPAA (se dados de saúde)

---

## Como Usar Este Checklist

1. **Ao criar projeto novo:** Comece da Fase 0, marque itens conforme implementa
2. **Antes de cada release:** Verifique se todos os itens da fase atual estão completos
3. **Em audits:** Use como base + adicione especificidades do seu domínio
4. **Documente exceções:** Se um item não se aplica, documente o motivo

### Comandos Úteis

```bash
# Verificar secrets no repo
git log -p | grep -i "password\|secret\|key\|token" --color=never

# Audit de dependências
npm audit
pip-audit
cargo audit

# Verificar headers de segurança
curl -I https://seudominio.com

# Verificar TLS
nmap --script ssl-enum-ciphers -p 443seudominio.com
```
