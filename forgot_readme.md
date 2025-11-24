# 🔐 Guia Completo: Implementação de Recuperação de Senha (Forgot Password)

Este documento explica detalhadamente como foi implementada a funcionalidade de **recuperação de senha** seguindo os princípios de **Arquitetura Limpa** e **DDD (Domain-Driven Design)** em NestJS.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura e Estrutura](#arquitetura-e-estrutura)
3. [Fluxo Completo](#fluxo-completo)
4. [Componentes e Implementação](#componentes-e-implementação)
5. [Banco de Dados](#banco-de-dados)
6. [Endpoints da API](#endpoints-da-api)
7. [Segurança e Validações](#segurança-e-validações)
8. [Como Replicar em Outro Projeto](#como-replicar-em-outro-projeto)
9. [Exemplos de Uso](#exemplos-de-uso)

---

## 🎯 Visão Geral

A funcionalidade de recuperação de senha permite que usuários que esqueceram suas senhas possam redefini-las através de um link enviado por email. O fluxo é dividido em **3 etapas principais**:

1. **Solicitação de Recuperação**: Usuário informa o email
2. **Validação do Token**: Frontend valida se o token é válido antes de mostrar o formulário
3. **Redefinição de Senha**: Usuário define uma nova senha

### Características Principais

- ✅ **Token JWT** com expiração de 20 minutos
- ✅ **Rate Limiting** de 1 minuto entre solicitações
- ✅ **Invalidação automática** do token após uso
- ✅ **Validação dupla**: Token no banco + Validação JWT
- ✅ **Email extraído do JWT** (não precisa enviar no body)
- ✅ **Processamento assíncrono** de emails
- ✅ **Hash de senha** antes de salvar

---

## 🏗️ Arquitetura e Estrutura

A implementação segue **Arquitetura Limpa** e **DDD**, com separação clara de responsabilidades:

```
src/
├── domain/                          # Camada de Domínio (Regras de Negócio)
│   └── project/
│       ├── enterprise/
│       │   └── entities/
│       │       └── verificationToken.ts    # Entidade de Domínio
│       └── application/
│           ├── use-cases/                  # Casos de Uso
│           │   ├── generate-verification-token.ts
│           │   ├── validate-reset-token.ts
│           │   ├── verify-account.ts
│           │   └── update-password.ts
│           ├── repositories/               # Interfaces de Repositórios
│           │   └── verification-token-repository.ts
│           ├── cryptography/              # Interfaces de Criptografia
│           │   └── encrypter-account-validation.ts
│           └── errors/                    # Erros de Domínio
│               ├── email-not-found-error.ts
│               ├── token-not-valid-error.ts
│               └── update-password-error.ts
│
└── infra/                            # Camada de Infraestrutura
    ├── http/
    │   └── controllers/
    │       └── user/
    │           ├── forgot-password.controller.ts
    │           ├── validate-reset-token.controller.ts
    │           └── update-password.controller.ts
    ├── database/
    │   └── prisma/
    │       └── repositories/
    │           └── prisma-verification-token-reposiotry.ts
    ├── cryptography/
    │   └── jwt-encrypter-account-validation.ts
    └── jobs/
        └── mail/
            ├── send-mail-producer.ts
            └── send-mail-consumer.ts
```

---

## 🔄 Fluxo Completo

### Diagrama do Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 1: SOLICITAÇÃO DE RECUPERAÇÃO                            │
└─────────────────────────────────────────────────────────────────┘

1. Cliente → POST /user/forgot-password
   Body: { email: "user@example.com" }
   ↓
2. ForgotPasswordController.handle()
   ↓
3. GenerateVerificationTokenUseCase.execute()
   ├─→ Busca usuário por email
   ├─→ Verifica rate limit (1 minuto)
   ├─→ Gera JWT token (expira em 20min)
   └─→ Salva VerificationToken no banco
   ↓
4. SendMailProducer.sendMailRecovery()
   ↓
5. Fila Bull (send-mail-queue)
   ↓
6. SendMailConsumer.process()
   ↓
7. Envia email com link: reset-password/update?token=xxx

┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 2: VALIDAÇÃO DO TOKEN (NOVO)                              │
└─────────────────────────────────────────────────────────────────┘

1. Cliente → GET /user/validate-reset-token?token=xxx
   ↓
2. ValidateResetTokenController.handle()
   ↓
3. ValidateResetTokenUseCase.execute()
   ├─→ Decodifica JWT para extrair email
   ├─→ Busca token no banco
   └─→ Valida JWT (assinatura + expiração)
   ↓
4. Retorna { valid: true, email: "user@example.com" }
   ou { valid: false, message: "..." }

┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 3: REDEFINIÇÃO DA SENHA                                   │
└─────────────────────────────────────────────────────────────────┘

1. Cliente → PUT /user/update-password
   Body: { token: "xxx", password: "novaSenha123" }
   ↓
2. UpdatePasswordController.handle()
   ↓
3. VerifyAccountUseCase.execute()
   ├─→ Decodifica JWT para extrair email
   ├─→ Busca usuário por email
   ├─→ Busca token no banco
   └─→ Valida JWT
   ↓
4. UpdatePasswordUseCase.execute()
   ├─→ Faz hash da nova senha
   ├─→ Atualiza senha no banco
   └─→ INVALIDA o token (delete do banco)
   ↓
5. Retorna 201 (sucesso)
```

---

## 🧩 Componentes e Implementação

### 1. Entidade de Domínio: VerificationToken

**Arquivo**: `src/domain/project/enterprise/entities/verificationToken.ts`

```typescript
export interface VerificationTokenProps {
  createAt: Date
  updatedAt?: Date | null
  userId: UniqueEntityID
  token: string
  type: VerificationTokenType
}

export class VerificationToken extends Entity<VerificationTokenProps> {
  static create(
    props: Optional<VerificationTokenProps, 'createAt' | 'type'>,
    id?: UniqueEntityID,
  ) {
    return new VerificationToken(
      {
        ...props,
        type: props.type ?? 'RESET_PASSWORD',
        createAt: props.createAt ?? new Date(),
      },
      id,
    )
  }
}
```

**Características**:
- Entidade de domínio pura (sem dependências de infraestrutura)
- Tipo padrão: `RESET_PASSWORD`
- Validações de negócio centralizadas

---

### 2. Use Case: GenerateVerificationTokenUseCase

**Arquivo**: `src/domain/project/application/use-cases/generate-verification-token.ts`

**Responsabilidade**: Gerar token de verificação e salvar no banco

**Fluxo**:
1. Busca usuário por email
2. Verifica rate limit (1 minuto)
3. Gera JWT token
4. Cria e salva VerificationToken

**Erros possíveis**:
- `EmailNotFoundError`: Email não encontrado
- `FileResendNotAllowedInTimeError`: Rate limit atingido

---

### 3. Use Case: ValidateResetTokenUseCase (NOVO)

**Arquivo**: `src/domain/project/application/use-cases/validate-reset-token.ts`

**Responsabilidade**: Validar se o token é válido antes de mostrar o formulário

**Fluxo**:
1. Decodifica JWT para extrair email
2. Busca token no banco
3. Valida JWT (assinatura + expiração)
4. Retorna email se válido

**Retorno**:
```typescript
{
  valid: true,
  email: "user@example.com"
}
```

---

### 4. Use Case: VerifyAccountUseCase (ATUALIZADO)

**Arquivo**: `src/domain/project/application/use-cases/verify-account.ts`

**Mudança**: Agora extrai email do JWT (não precisa mais no request)

**Fluxo**:
1. Decodifica JWT para extrair email e userId
2. Busca usuário por email
3. Busca token no banco
4. Valida JWT
5. Retorna usuário e ID do token (para invalidação)

---

### 5. Use Case: UpdatePasswordUseCase (ATUALIZADO)

**Arquivo**: `src/domain/project/application/use-cases/update-password.ts`

**Mudança**: Agora invalida o token após reset bem-sucedido

**Fluxo**:
1. Faz hash da nova senha
2. Atualiza senha no banco
3. **INVALIDA o token** (delete do banco)

---

### 6. Interface: EncrypterValidationToken (ATUALIZADA)

**Arquivo**: `src/domain/project/application/cryptography/encrypter-account-validation.ts`

```typescript
export interface TokenPayload {
  sub: string  // userId
  email: string
}

export abstract class EncrypterValidationToken {
  abstract generateEmailVerificationToken(userId: string, email: string): string
  abstract validateEmailVerificationToken(token: string): Promise<boolean>
  abstract decodeToken(token: string): TokenPayload | null  // NOVO
}
```

**Método novo**: `decodeToken` - Extrai payload do JWT sem validar

---

### 7. Implementação: JwtEncrypterAccountValidation (ATUALIZADA)

**Arquivo**: `src/infra/cryptography/jwt-encrypter-account-validation.ts`

```typescript
generateEmailVerificationToken(userId: string, email: string): string {
  return this.jwtService.sign(
    { sub: userId, email },
    {
      secret: this.config.get('JWT_PRIVATE_KEY'),
      expiresIn: '20m',
      algorithm: 'HS256',
    },
  )
}

decodeToken(token: string): TokenPayload | null {
  try {
    const payload = this.jwtService.decode(token) as TokenPayload
    return payload
  } catch (error) {
    return null
  }
}
```

---

### 8. Repositório: VerificationTokenRepository (ATUALIZADO)

**Arquivo**: `src/domain/project/application/repositories/verification-token-repository.ts`

```typescript
export abstract class VerificationTokenRepository {
  abstract findByUserAndToken(userId: string, token: string): Promise<VerificationToken | null>
  abstract findByToken(token: string): Promise<VerificationToken | null>  // NOVO
  abstract create(verificationToken: VerificationToken): Promise<VerificationToken>
  abstract delete(id: string): Promise<void>  // NOVO
  abstract findByUserAndPermissionTimeResend(userId: string, time: Date): Promise<VerificationToken | null>
}
```

**Métodos novos**:
- `findByToken`: Busca token apenas pelo token (sem userId)
- `delete`: Remove token do banco (invalidação)

---

### 9. Controller: ForgotPasswordController

**Arquivo**: `src/infra/http/controllers/user/forgot-password.controller.ts`

```typescript
@Controller('/user/forgot-password')
@Public()
export class ForgotPasswordController {
  @Post()
  @HttpCode(201)
  async handle(@Body(bodyValidationPipe) body: { email: string }) {
    const result = await this.generateVerificationTokenUseCase.execute({
      email: body.email,
      date: subMinutes(new Date(), 1),
    })
    
    if (result.isLeft()) {
      // Trata erros...
    }
    
    await this.sendMail.sendMailRecovery(body.email, result.value.token)
  }
}
```

---

### 10. Controller: ValidateResetTokenController (NOVO)

**Arquivo**: `src/infra/http/controllers/user/validate-reset-token.controller.ts`

```typescript
@Controller('/user/validate-reset-token')
@Public()
export class ValidateResetTokenController {
  @Get()
  @HttpCode(200)
  async handle(@Query(queryValidationPipe) query: { token: string }) {
    const result = await this.validateResetTokenUseCase.execute({
      token: query.token,
    })
    
    if (result.isLeft()) {
      throw new ForbiddenException({
        valid: false,
        message: result.value.message,
      })
    }
    
    return {
      valid: result.value.valid,
      email: result.value.email,
    }
  }
}
```

---

### 11. Controller: UpdatePasswordController (ATUALIZADO)

**Arquivo**: `src/infra/http/controllers/user/update-password.controller.ts`

**Mudança**: Não precisa mais de email no body

```typescript
@Controller('/user/update-password')
@Public()
export class UpdatePasswordController {
  @Put()
  @HttpCode(201)
  async handle(@Body(bodyValidationPipe) body: { token: string, password: string }) {
    const result = await this.verifyAccountUseCase.execute({ 
      token: body.token  // Email extraído do JWT
    })
    
    const { user, verificationTokenId } = result.value
    
    await this.updatePassowordUseCase.execute({
      userId: user.id.toString(),
      password: body.password,
      verificationTokenId,  // Para invalidação
    })
  }
}
```

---

## 🗄️ Banco de Dados

### Schema Prisma

```prisma
model VerificationToken {
  id        String                @id @default(uuid())
  userId    String
  token     String                @unique
  type      VerificationTokenType
  createAt  DateTime              @default(now())
  updatedAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@map("verification_tokens")
}

enum VerificationTokenType {
  RESET_PASSWORD
}
```

### Migração

```sql
CREATE TYPE "VerificationTokenType" AS ENUM ('RESET_PASSWORD');

CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "VerificationTokenType" NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
```

---

## 🌐 Endpoints da API

### 1. POST /user/forgot-password

**Descrição**: Solicita recuperação de senha

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (201):
```json
// Sem body (apenas status code)
```

**Erros**:
- `400 Bad Request`: Email não encontrado ou rate limit atingido

---

### 2. GET /user/validate-reset-token (NOVO)

**Descrição**: Valida se o token é válido antes de mostrar o formulário

**Query Params**:
```
?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200):
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

**Erros**:
- `403 Forbidden`: Token inválido ou expirado
```json
{
  "valid": false,
  "message": "Token não válido ou expirado."
}
```

---

### 3. PUT /user/update-password

**Descrição**: Redefine a senha do usuário

**Request**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "novaSenha123"
}
```

**Response** (201):
```json
// Sem body (apenas status code)
```

**Erros**:
- `403 Forbidden`: Token inválido
- `422 Unprocessable Entity`: Usuário não encontrado
- `500 Internal Server Error`: Erro ao atualizar senha

---

## 🔒 Segurança e Validações

### 1. Rate Limiting

**Implementação**: Verifica se existe token criado nos últimos 1 minuto

```typescript
const existVerificationToken =
  await this.verificationTokenRepository.findByUserAndPermissionTimeResend(
    user.id.toString(),
    subMinutes(new Date(), 1),
  )
```

**Proteção**: Previne spam de solicitações de recuperação

---

### 2. Token JWT

**Características**:
- Expiração: 20 minutos
- Algoritmo: HS256
- Payload: `{ sub: userId, email }`

**Validação**:
- Assinatura verificada
- Expiração verificada
- Token existe no banco

---

### 3. Invalidação de Token

**Implementação**: Token é deletado do banco após uso bem-sucedido

```typescript
await this.verificationTokenRepository.delete(verificationTokenId)
```

**Proteção**: Previne reutilização do mesmo token

---

### 4. Hash de Senha

**Implementação**: Senha é hasheada antes de salvar

```typescript
const hashedPassword = await this.hashGenerator.hash(password)
await this.userRepository.updatePassword(userId, hashedPassword)
```

---

### 5. Validação Dupla

1. **Token no banco**: Verifica se o token existe
2. **JWT válido**: Verifica assinatura e expiração

---

## 📦 Como Replicar em Outro Projeto

### Passo 1: Estrutura do Banco de Dados

1. Adicione o schema no `prisma/schema.prisma`:

```prisma
model VerificationToken {
  id        String                @id @default(uuid())
  userId    String
  token     String                @unique
  type      VerificationTokenType
  createAt  DateTime              @default(now())
  updatedAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@map("verification_tokens")
}

enum VerificationTokenType {
  RESET_PASSWORD
}
```

2. Execute a migração:
```bash
npx prisma migrate dev --name add_verification_token
```

---

### Passo 2: Dependências

Instale as dependências necessárias:

```bash
npm install @nestjs/jwt @nestjs/bull bull
npm install -D @types/bull
```

---

### Passo 3: Variáveis de Ambiente

Adicione no `.env`:

```env
JWT_PRIVATE_KEY=sua-chave-secreta-aqui
CLIENT_DOMAIN=http://localhost:3000
SERVER_DOMAIN=http://localhost:3333
```

---

### Passo 4: Copiar Arquivos

Copie os seguintes arquivos mantendo a estrutura de pastas:

**Domain Layer**:
- `src/domain/project/enterprise/entities/verificationToken.ts`
- `src/domain/project/application/use-cases/generate-verification-token.ts`
- `src/domain/project/application/use-cases/validate-reset-token.ts`
- `src/domain/project/application/use-cases/verify-account.ts`
- `src/domain/project/application/use-cases/update-password.ts`
- `src/domain/project/application/repositories/verification-token-repository.ts`
- `src/domain/project/application/cryptography/encrypter-account-validation.ts`
- `src/domain/project/application/use-cases/errors/*.ts`

**Infrastructure Layer**:
- `src/infra/http/controllers/user/forgot-password.controller.ts`
- `src/infra/http/controllers/user/validate-reset-token.controller.ts`
- `src/infra/http/controllers/user/update-password.controller.ts`
- `src/infra/database/prisma/repositories/prisma-verification-token-reposiotry.ts`
- `src/infra/database/prisma/mappers/prisma-verification-token-mapper.ts`
- `src/infra/cryptography/jwt-encrypter-account-validation.ts`
- `src/infra/jobs/mail/send-mail-producer.ts`
- `src/infra/jobs/mail/send-mail-consumer.ts`

---

### Passo 5: Configurar Módulos

1. **CryptographyModule**: Certifique-se de que `JwtEncrypterAccountValidation` está registrado

2. **DatabaseModule**: Certifique-se de que `PrismaVerificationTokenRepository` está registrado

3. **HttpModule**: Adicione os controllers e use cases:

```typescript
@Module({
  controllers: [
    ForgotPasswordController,
    ValidateResetTokenController,
    UpdatePasswordController,
  ],
  providers: [
    GenerateVerificationTokenUseCase,
    ValidateResetTokenUseCase,
    VerifyAccountUseCase,
    UpdatePasswordUseCase,
  ],
})
export class HttpModule {}
```

---

### Passo 6: Configurar Bull (Fila de Emails)

1. Configure o módulo Bull:

```typescript
import { BullModule } from '@nestjs/bull'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'send-mail-queue',
    }),
  ],
})
export class JobsModule {}
```

2. Configure o processador:

```typescript
@Processor('send-mail-queue')
class SendMailConsumer {
  @Process('send-mail-recovery-job')
  async sendMailRecoveryJob(job: Job<{ email: string; confirmationToken: string }>) {
    // Implementar envio de email
  }
}
```

---

## 💻 Exemplos de Uso

### Frontend: Solicitar Recuperação

```typescript
async function requestPasswordReset(email: string) {
  const response = await fetch('http://api.example.com/user/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })
  
  if (response.status === 201) {
    // Email enviado com sucesso
    alert('Verifique seu email para redefinir a senha')
  } else {
    const error = await response.json()
    alert(error.message)
  }
}
```

---

### Frontend: Validar Token

```typescript
async function validateToken(token: string) {
  const response = await fetch(
    `http://api.example.com/user/validate-reset-token?token=${token}`
  )
  
  if (response.ok) {
    const data = await response.json()
    if (data.valid) {
      // Token válido - mostrar formulário
      return { valid: true, email: data.email }
    }
  }
  
  // Token inválido
  return { valid: false }
}
```

---

### Frontend: Redefinir Senha

```typescript
async function resetPassword(token: string, newPassword: string) {
  const response = await fetch('http://api.example.com/user/update-password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      password: newPassword,
    }),
  })
  
  if (response.status === 201) {
    alert('Senha redefinida com sucesso!')
    // Redirecionar para login
  } else {
    const error = await response.json()
    alert(error.message)
  }
}
```

---

### Fluxo Completo no Frontend

```typescript
// 1. Usuário solicita recuperação
await requestPasswordReset('user@example.com')

// 2. Usuário clica no link do email
// URL: http://frontend.com/reset-password?token=xxx

// 3. Frontend valida token ao carregar página
const token = new URLSearchParams(window.location.search).get('token')
const validation = await validateToken(token)

if (!validation.valid) {
  // Mostrar erro: Token inválido ou expirado
  return
}

// 4. Mostrar formulário de reset
// Email já está disponível em validation.email

// 5. Usuário preenche nova senha e submete
await resetPassword(token, newPassword)
```

---

## ✅ Checklist de Implementação

- [x] Schema do banco de dados criado
- [x] Migração executada
- [x] Entidade de domínio `VerificationToken` criada
- [x] Repositório abstrato criado
- [x] Implementação Prisma do repositório
- [x] Use cases implementados:
  - [x] `GenerateVerificationTokenUseCase`
  - [x] `ValidateResetTokenUseCase`
  - [x] `VerifyAccountUseCase`
  - [x] `UpdatePasswordUseCase`
- [x] Interface de criptografia criada
- [x] Implementação JWT criada
- [x] Controllers criados:
  - [x] `ForgotPasswordController`
  - [x] `ValidateResetTokenController`
  - [x] `UpdatePasswordController`
- [x] Sistema de fila (Bull) configurado
- [x] Template de email criado
- [x] Rate limiting implementado
- [x] Invalidação de token após uso
- [x] Extração de email do JWT
- [x] Validação dupla (banco + JWT)
- [x] Hash de senha antes de salvar

---

## 🎓 Princípios Aplicados

### Arquitetura Limpa

- **Separação de responsabilidades**: Domain, Application e Infrastructure
- **Dependência invertida**: Domain não depende de Infrastructure
- **Testabilidade**: Fácil de testar cada camada isoladamente

### DDD (Domain-Driven Design)

- **Entidades de domínio**: `VerificationToken` encapsula regras de negócio
- **Use cases**: Cada caso de uso representa uma ação do domínio
- **Repositórios**: Abstração da persistência
- **Value Objects**: Tipos específicos do domínio

### SOLID

- **Single Responsibility**: Cada classe tem uma responsabilidade
- **Open/Closed**: Extensível sem modificar código existente
- **Liskov Substitution**: Implementações podem ser substituídas
- **Interface Segregation**: Interfaces específicas
- **Dependency Inversion**: Dependências apontam para abstrações

---

## 📝 Notas Finais

Esta implementação segue as melhores práticas de segurança e arquitetura, garantindo:

1. **Segurança**: Tokens expiram, são invalidados após uso e têm rate limiting
2. **UX**: Validação de token antes de mostrar formulário
3. **Manutenibilidade**: Código organizado e testável
4. **Escalabilidade**: Processamento assíncrono de emails
5. **Reutilização**: Fácil de replicar em outros projetos

---

## 🔗 Referências

- [NestJS Documentation](https://docs.nestjs.com/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

**Desenvolvido seguindo Arquitetura Limpa e DDD** 🚀

