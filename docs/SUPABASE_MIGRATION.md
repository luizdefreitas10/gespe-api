# Migração gespe-api para Supabase

## Arquitetura após a migração

```
┌─────────────────────┐     ┌──────────────────────────────┐
│   Render            │     │   Supabase                    │
│   gespe-api         │────▶│   PostgreSQL (banco)          │
│   (NestJS backend)  │     │   + Auth, Storage, Realtime   │
└─────────────────────┘     └──────────────────────────────┘
```

**Importante:** O Supabase **não hospeda backends NestJS**. O NestJS continua no Render e passa a usar o PostgreSQL do Supabase como banco.

---

## Projeto Supabase existente

O projeto **luizdefreitas10's Project** (`nzrlmvrsoqhiovkkcbgl`) já está criado. O banco foi preparado e está pronto para receber as migrations.

---

## Passo 1: Obter a connection string (recomendado: conexão direta)

Para **Prisma** e **`prisma migrate deploy`** no Render, use a conexão **direta** (porta **5432**), não o pooler na 6543 — evita erros como `FATAL: Tenant or user not found`.

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e abra o projeto
2. **Project Settings** → **Database** → **Connection string** → **URI**
3. Use o host **`db.<ref>.supabase.co`** e porta **5432** (modo “Direct connection”, se o painel separar)
4. Substitua `[YOUR-PASSWORD]` pela senha real
5. Garanta **`?sslmode=require`** no final

**Senha com caracteres especiais:** codifique na URL (ex.: `!` → `%21`, `@` → `%40`). Veja também `.env.example`.

**Template para este projeto:**
```
postgresql://postgres:[SUA_SENHA_URL_ENCODED]@db.nzrlmvrsoqhiovkkcbgl.supabase.co:5432/postgres?sslmode=require
```

Se não lembrar a senha, use **Reset database password** em Project Settings → Database.

---

## Passo 3: Rodar migrations no Supabase (local)

No terminal, na pasta do projeto:

```bash
# Defina a DATABASE_URL do Supabase e rode as migrations
DATABASE_URL="sua_connection_string_supabase" npx prisma migrate deploy
```

Ou crie um `.env` temporário:

```bash
cp .env.example .env
# Edite .env e cole a DATABASE_URL do Supabase
npx prisma migrate deploy
```

---

## Passo 4: Configurar variáveis no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Abra o serviço **gespe-api**
3. **Environment** → **Environment Variables**
4. Atualize ou adicione:

| Chave | Valor |
|-------|-------|
| `DATABASE_URL` | Connection string do Supabase (Passo 2) |
| `JWT_PRIVATE_KEY` | Chave privada RS256 em base64 |
| `JWT_PUBLIC_KEY` | Chave pública RS256 em base64 |
| `PORT` | `3333` |
| `CORS_ORIGIN` | `https://dashboard-cti-arpe.onrender.com,http://localhost:3000` |

5. Salve e faça **Manual Deploy**

---

## Passo 5: Validar

Após o deploy:

1. Teste o endpoint de health: `https://gespe-api.onrender.com/hello`
2. Teste o login: `POST /sessions` com email/senha
3. Confira os dados no Supabase: **Table Editor** no Dashboard

---

## Migrar dados de um banco existente (opcional)

Se você já tem dados no PostgreSQL atual (ex.: local ou outro host):

```bash
# Exportar do banco antigo
pg_dump "postgresql://user:pass@host:5432/gespe" --no-owner --no-acl > backup.sql

# Importar no Supabase (use a connection string direta, porta 5432, não pooler)
psql "postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres" < backup.sql
```

Depois rode `prisma migrate deploy` se necessário para alinhar o estado das migrations.

---

## Solução de problemas

### Erro de SSL
- Verifique se a URL termina com `?sslmode=require`
- Use a URL do **pooler** (porta 6543) para o Render

### MCP Supabase com erro
- Em Cursor: **Settings → Tools & MCP** e verifique o status
- Confirme que `SUPABASE_ACCESS_TOKEN` em `~/.cursor/mcp.json` está correto
- Reinicie o Cursor após alterar o `mcp.json`

### Migrations falhando
- Confirme que o banco está vazio ou que as migrations são compatíveis
- Se houver conflito, considere `prisma migrate reset` em ambiente de teste primeiro
