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

## Passo 1: Connection strings (Prisma: `DATABASE_URL` + `DIRECT_URL`)

O projeto usa [o padrão Prisma + Supabase](https://supabase.com/docs/guides/database/prisma): **`DATABASE_URL`** (pooler modo **transação**, porta **6543**) e **`DIRECT_URL`** (pooler modo **sessão**, porta **5432** no **mesmo** host `aws-0-<região>.pooler.supabase.com`).

Isso evita **`P1001: Can't reach database server`** no Render ao usar só o host **`db.<ref>.supabase.co`** (comum quando o ambiente só tem IPv4 ou a rota até o host direto falha).

1. Dashboard → **Connect** (ou **Project Settings** → **Database** → **Connection string**)
2. Copie a string do **Supavisor** / pooler:
   - **Transaction mode** (6543) → valor de **`DATABASE_URL`** — acrescente `?pgbouncer=true&sslmode=require` se o painel não incluir
   - **Session mode** (5432 no host `*.pooler.supabase.com`) → valor de **`DIRECT_URL`** — use `?sslmode=require`
3. Usuário do pooler: **`postgres.<project-ref>`** (ex.: `postgres.nzrlmvrsoqhiovkkcbgl`), não só `postgres`
4. **Senha com caracteres especiais:** codifique na URL (`!` → `%21`, etc.). Veja `.env.example`

**Templates (ajuste `REGIAO` conforme o projeto — ex.: `us-east-1`):**

```
DATABASE_URL="postgresql://postgres.nzrlmvrsoqhiovkkcbgl:[SENHA_URL_ENCODED]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

DIRECT_URL="postgresql://postgres.nzrlmvrsoqhiovkkcbgl:[SENHA_URL_ENCODED]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**Só no desenvolvimento local**, se a conexão **direta** `db.nzrlmvrsoqhiovkkcbgl.supabase.co:5432` funcionar, você pode repetir a **mesma** URL em `DATABASE_URL` e `DIRECT_URL` (usuário `postgres`, sem `.ref`).

Se não lembrar a senha: **Reset database password** em Project Settings → Database.

---

## Passo 3: Rodar migrations no Supabase (local)

No terminal, na pasta do projeto:

```bash
# Com .env contendo DATABASE_URL e DIRECT_URL (migrate usa DIRECT_URL)
npx prisma migrate deploy
```

Ou em uma linha (use a URL de **sessão** do pooler ou a direta `db.*` em ambas):

```bash
DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
```

---

## Passo 4: Configurar variáveis no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Abra o serviço **gespe-api**
3. **Environment** → **Environment Variables**
4. Atualize ou adicione:

| Chave | Valor |
|-------|-------|
| `DATABASE_URL` | Pooler **transação** (6543), ver Passo 1 |
| `DIRECT_URL` | Pooler **sessão** (5432 no host pooler), ver Passo 1 |
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

### `P1001: Can't reach database server` no Render (host `db.*`)
- Configure **`DATABASE_URL`** + **`DIRECT_URL`** com o **Supavisor** (`aws-0-<região>.pooler.supabase.com`), não só `db.<ref>.supabase.co`
- Confirme usuário **`postgres.<ref>`** e senha **URL-encoded**

### Erro de SSL
- Inclua `?sslmode=require` (ou `&sslmode=require` após outros parâmetros)

### MCP Supabase com erro
- Em Cursor: **Settings → Tools & MCP** e verifique o status
- Confirme que `SUPABASE_ACCESS_TOKEN` em `~/.cursor/mcp.json` está correto
- Reinicie o Cursor após alterar o `mcp.json`

### Migrations falhando
- Confirme que o banco está vazio ou que as migrations são compatíveis
- Se houver conflito, considere `prisma migrate reset` em ambiente de teste primeiro
