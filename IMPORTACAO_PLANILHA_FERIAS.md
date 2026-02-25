# Guia de Implementação: Importação de Planilha Excel de Férias

Este documento descreve passo a passo como implementar a funcionalidade de importação de planilha Excel de férias no projeto, seguindo os princípios de Clean Architecture e DDD.

## Visão Geral

A funcionalidade deve:
1. Receber um arquivo Excel via endpoint
2. Identificar a coluna "NOME" na planilha principal
3. Para cada nome, criar um usuário no banco de dados
4. Processar as abas ocultas (uma por usuário) que contêm as solicitações de férias
5. Salvar todas as solicitações de férias no banco de dados

## Estrutura da Planilha

### Planilha Principal (LISTA SERVIDORES)
- **Coluna NOME**: Nome completo do servidor
- **Colunas de anos (2018-2026)**: Saldos de férias por exercício

### Abas Ocultas (uma por usuário)
Cada aba oculta possui o nome do usuário e contém as seguintes colunas:
- **DATA DA SOLICITAÇÃO**: Data da solicitação
- **N° DO SEI**: Número do processo SEI
- **N° DO DOCUMENTO (SEI)**: Número do documento SEI
- **TIPO DA SOLICITAÇÃO**: Tipo da solicitação (PROGRAMAÇÃO DE FÉRIAS, SOLICITAÇÃO DE GOZO, ALTERAÇÃO DE GOZO, SUSPENSAO DE GOZO)
- **FÉRIAS EXERCÍCIO**: Ano do exercício
- **QUANTIDADE DE DIAS**: Quantidade de dias (pode ser negativo para gozo)
- **OBSERVAÇÕES**: Observações sobre a solicitação
- **GOZO EFETIVO**: Se o gozo foi efetivo (SIM/NÃO)

---

## Passo 1: Instalar Dependências

Primeiro, precisamos instalar as bibliotecas necessárias para processar arquivos Excel:

```bash
npm install xlsx multer
npm install -D @types/multer
```

**Bibliotecas:**
- `xlsx`: Para ler e processar arquivos Excel
- `multer`: Middleware do NestJS para upload de arquivos
- `@types/multer`: Tipos TypeScript para multer

---

## Passo 2: Configurar Upload de Arquivos no NestJS

### 2.1. Instalar o pacote de upload do NestJS

```bash
npm install @nestjs/platform-express
```

O `@nestjs/platform-express` já deve estar instalado, mas o multer é necessário para processar multipart/form-data.

### 2.2. Configurar o módulo HTTP para aceitar arquivos

O NestJS já usa Express por padrão, então o multer já está disponível. Não é necessário configuração adicional no módulo.

---

## Passo 3: Modificar o Use Case de Registro de Usuário

Precisamos tornar os campos opcionais no `RegisterUserUseCase`, exceto `fullName`, `email` e `password`.

### 3.1. Atualizar a interface do RegisterUserUseCase

**Arquivo:** `src/domain/app/application/use-cases/register-user.ts`

```typescript
interface RegisterUserUseCaseRequest {
  fullName: string;
  email: string;
  password: string;
  birthDate?: Date; // Tornar opcional
  registry?: string | null;
  position?: string; // Tornar opcional
  department?: string; // Tornar opcional
  role?: Role;
}
```

### 3.2. Atualizar a implementação do use case

Modifique o método `execute` para usar valores padrão quando os campos opcionais não forem fornecidos:

```typescript
async execute({
  fullName,
  password,
  email,
  birthDate,
  department,
  position,
  registry,
  role,
}: RegisterUserUseCaseRequest): Promise<RegisterUserUseCaseResponse> {
  const userWithSameEmail = await this.usersRepository.findByEmail(email);

  if (userWithSameEmail) {
    return left(new UserAlreadyExistsError(email));
  }

  const hashedPassword = await this.hashGenerator.hash(password);

  // Valores padrão para campos opcionais
  const defaultBirthDate = birthDate || new Date('1990-01-01');
  const defaultPosition = position || 'Servidor';
  const defaultDepartment = department || 'Não informado';
  const firstName = 


  const user = User.create({
    email,
    fullName,
    password: hashedPassword,
    birthDate: defaultBirthDate,
    department: defaultDepartment,
    position: defaultPosition,
    registry,
    role: role ?? 'USER',
  });

  await this.usersRepository.createUser(user);

  return right({
    user,
  });
}
```

### 3.3. Atualizar o schema de validação do controller

**Arquivo:** `src/infra/http/controllers/user/create-account-controller.ts`

Torne os campos opcionais no schema Zod:

```typescript
const createrAccountBodySchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  password: z.string(),
  birthDate: z.coerce.date().optional(),
  registry: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  role: UserRole.optional(),
});
```

---

## Passo 4: Criar Use Case de Importação de Planilha

### 4.1. Criar o arquivo do use case

**Arquivo:** `src/domain/app/application/use-cases/import-vacation-spreadsheet.ts`

```typescript
import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { UserRepository } from "../repositories/user-repository";
import { VacationRepository } from "../repositories/vacation-repository";
import { RegisterUserUseCase } from "./register-user";
import { RegisterVacationUseCase } from "./register-vacation";
import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { VacationRequestType, EffectiveEnjoymentEnum } from "@prisma/client";
import * as XLSX from "xlsx";

interface ImportVacationSpreadsheetUseCaseRequest {
  file: Express.Multer.File;
}

type ImportVacationSpreadsheetUseCaseResponse = Either<
  Error,
  {
    usersCreated: number;
    vacationsCreated: number;
    errors: string[];
  }
>;

@Injectable()
export class ImportVacationSpreadsheetUseCase {
  constructor(
    private userRepository: UserRepository,
    private vacationRepository: VacationRepository,
    private registerUserUseCase: RegisterUserUseCase,
    private registerVacationUseCase: RegisterVacationUseCase
  ) {}

  async execute({
    file,
  }: ImportVacationSpreadsheetUseCaseRequest): Promise<ImportVacationSpreadsheetUseCaseResponse> {
    try {
      // Ler o arquivo Excel
      const workbook = XLSX.read(file.buffer, { type: "buffer" });

      // Obter a planilha principal (LISTA SERVIDORES)
      const mainSheetName = "LISTA SERVIDORES";
      const mainSheet = workbook.Sheets[mainSheetName];
      
      if (!mainSheet) {
        return left(new Error(`Planilha "${mainSheetName}" não encontrada`));
      }

      // Converter para JSON
      const mainData = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });

      // Encontrar a coluna NOME
      const headerRow = mainData[1] as string[]; // Segunda linha (índice 1) contém os cabeçalhos
      const nomeColumnIndex = headerRow.findIndex(
        (cell: string) => cell && cell.toString().toUpperCase().trim() === "NOME"
      );

      if (nomeColumnIndex === -1) {
        return left(new Error('Coluna "NOME" não encontrada na planilha'));
      }

      const usersCreated: string[] = [];
      const vacationsCreated: number[] = [];
      const errors: string[] = [];

      // Iterar sobre as linhas de dados (começando da linha 3, índice 2)
      for (let i = 2; i < mainData.length; i++) {
        const row = mainData[i] as any[];
        const fullName = row[nomeColumnIndex];

        if (!fullName || !fullName.toString().trim()) {
          continue; // Pular linhas vazias
        }

        const nameStr = fullName.toString().trim();

        try {
          // Gerar email a partir do nome
          const email = this.generateEmailFromName(nameStr);

          // Verificar se o usuário já existe
          const existingUser = await this.userRepository.findByEmail(email);

          let userId: string;

          if (existingUser) {
            userId = existingUser.id.toString();
          } else {
            // Criar novo usuário
            const password = "12345678"; // Senha padrão de 1 a 8

            const result = await this.registerUserUseCase.execute({
              fullName: nameStr,
              email,
              password,
              // Campos opcionais não fornecidos
            });

            if (result.isLeft()) {
              errors.push(`Erro ao criar usuário ${nameStr}: ${result.value.message}`);
              continue;
            }

            userId = result.value.user.id.toString();
            usersCreated.push(userId);
          }

          // Processar a aba oculta do usuário
          const userSheetName = this.findUserSheetName(workbook, nameStr);
          
          if (userSheetName) {
            const userSheet = workbook.Sheets[userSheetName];
            const vacationCount = await this.processUserVacations(
              userSheet,
              userId,
              errors
            );
            vacationsCreated.push(vacationCount);
          }

        } catch (error) {
          errors.push(`Erro ao processar usuário ${nameStr}: ${error.message}`);
        }
      }

      return right({
        usersCreated: usersCreated.length,
        vacationsCreated: vacationsCreated.reduce((sum, count) => sum + count, 0),
        errors,
      });

    } catch (error) {
      return left(new Error(`Erro ao processar planilha: ${error.message}`));
    }
  }

  private generateEmailFromName(fullName: string): string {
    // Converter nome para formato de email
    // Exemplo: "João Silva" -> "joao.silva@gespe.gov.br"
    const normalized = fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z\s]/g, "") // Remove caracteres especiais
      .trim()
      .split(/\s+/)
      .join(".");

    return `${normalized}@gespe.gov.br`;
  }

  private findUserSheetName(workbook: XLSX.WorkBook, fullName: string): string | null {
    // Tentar encontrar a aba pelo nome do usuário
    // A aba pode ter o nome completo ou uma parte do nome
    const sheetNames = workbook.SheetNames;
    
    // Criar variações do nome para buscar
    const nameParts = fullName.toUpperCase().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    // Buscar por nome completo, primeiro nome + último nome, ou apenas primeiro nome
    const possibleNames = [
      fullName.toUpperCase(),
      `${firstName} ${lastName}`,
      firstName,
    ];

    for (const possibleName of possibleNames) {
      const found = sheetNames.find(
        (name) =>
          name.toUpperCase().includes(possibleName) ||
          possibleName.includes(name.toUpperCase())
      );

      if (found) {
        return found;
      }
    }

    return null;
  }

  private async processUserVacations(
    sheet: XLSX.WorkSheet,
    userId: string,
    errors: string[]
  ): Promise<number> {
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Encontrar a linha de cabeçalho
    let headerRowIndex = -1;
    const headerMapping: Record<string, number> = {};

    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i] as string[];
      const dataSolicitacaoIndex = row.findIndex(
        (cell: string) =>
          cell && cell.toString().toUpperCase().includes("DATA DA SOLICITAÇÃO")
      );

      if (dataSolicitacaoIndex !== -1) {
        headerRowIndex = i;

        // Mapear todas as colunas
        row.forEach((cell: string, index: number) => {
          if (cell) {
            const cellUpper = cell.toString().toUpperCase();
            if (cellUpper.includes("DATA DA SOLICITAÇÃO")) {
              headerMapping.dataSolicitacao = index;
            } else if (
              cellUpper.includes("N° DO SEI") ||
              cellUpper.includes("N DO SEI")
            ) {
              headerMapping.seiNumber = index;
            } else if (
              cellUpper.includes("N° DO DOCUMENTO") ||
              cellUpper.includes("N DO DOCUMENTO")
            ) {
              headerMapping.documentNumber = index;
            } else if (
              cellUpper.includes("TIPO") &&
              cellUpper.includes("SOLICITAÇÃO")
            ) {
              headerMapping.requestType = index;
            } else if (
              cellUpper.includes("FÉRIAS EXERCÍCIO") ||
              cellUpper.includes("FERIAS EXERCICIO")
            ) {
              headerMapping.year = index;
            } else if (
              cellUpper.includes("QUANTIDADE DE DIAS") ||
              cellUpper.includes("QTDADE DE DIA")
            ) {
              headerMapping.amountOfDays = index;
            } else if (
              cellUpper.includes("OBSERVAÇÃO") ||
              cellUpper.includes("OBSERVACOES")
            ) {
              headerMapping.observations = index;
            } else if (cellUpper.includes("GOZO EFETIVO")) {
              headerMapping.effectiveEnjoyment = index;
            }
          }
        });
        break;
      }
    }

    if (headerRowIndex === -1) {
      errors.push(`Cabeçalho não encontrado na aba do usuário ${userId}`);
      return 0;
    }

    let vacationCount = 0;

    // Processar cada linha de dados
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i] as any[];

      // Verificar se a linha está vazia
      if (
        !row ||
        row.every((cell) => !cell || cell.toString().trim() === "")
      ) {
        continue;
      }

      try {
        const dataSolicitacao = row[headerMapping.dataSolicitacao];
        const seiNumber = row[headerMapping.seiNumber];
        const documentNumber = row[headerMapping.documentNumber];
        const requestTypeStr = row[headerMapping.requestType];
        const year = row[headerMapping.year];
        const amountOfDays = row[headerMapping.amountOfDays];
        const observations = row[headerMapping.observations];
        const effectiveEnjoymentStr = row[headerMapping.effectiveEnjoyment];

        // Validar campos obrigatórios
        if (!dataSolicitacao || !requestTypeStr || !year) {
          continue; // Pular linhas incompletas
        }

        // Converter tipos
        const firstVacationDay = this.parseDate(dataSolicitacao);
        
        // Extrair datas de início e fim das observações se disponível
        // Formato esperado: "DD/MM/YY - DD/MM/YY" ou "DD/MM/YYYY - DD/MM/YYYY"
        let lastVacationDay = firstVacationDay;
        if (observations) {
          const dateRange = this.extractDateRangeFromObservations(
            observations.toString()
          );
          if (dateRange) {
            lastVacationDay = dateRange.endDate;
            // Opcionalmente, usar a data de início das observações
            // firstVacationDay = dateRange.startDate;
          }
        }
        const requestType = this.mapRequestType(requestTypeStr.toString());
        const yearNum = Number(year);
        const amountOfDaysNum = amountOfDays ? Number(amountOfDays) : 0;
        const effectiveEnjoyment = this.mapEffectiveEnjoyment(
          effectiveEnjoymentStr?.toString()
        );

        // Criar a solicitação de férias
        const result = await this.registerVacationUseCase.execute({
          userId: new UniqueEntityID(userId),
          firstVacationDay,
          lastVacationDay,
          vacationSeiNumber: seiNumber?.toString() || null,
          requestType,
          year: yearNum,
          amoutOfVacationDays: amountOfDaysNum,
          observations: observations?.toString() || null,
        });

        if (result.isLeft()) {
          errors.push(`Erro ao criar férias para usuário ${userId}: ${result.value.message}`);
        } else {
          vacationCount++;

          // Atualizar effectiveEnjoyment se necessário
          if (effectiveEnjoyment && effectiveEnjoyment !== "NO") {
            const vacation = result.value.vacation;
            vacation.effectiveEnjoyment = effectiveEnjoyment;
            await this.vacationRepository.updateVacation(vacation);
          }
        }

      } catch (error) {
        errors.push(`Erro ao processar linha ${i + 1}: ${error.message}`);
      }
    }

    return vacationCount;
  }

  private parseDate(dateValue: any): Date {
    if (dateValue instanceof Date) {
      return dateValue;
    }

    if (typeof dateValue === "number") {
      // Excel armazena datas como números (dias desde 1900-01-01)
      // Converter número do Excel para data JavaScript
      const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
      const jsDate = new Date(
        excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000
      );
      return jsDate;
    }

    if (typeof dateValue === "string") {
      // Tentar parsear string de data (formato DD/MM/YYYY ou YYYY-MM-DD)
      const dateStr = dateValue.trim();
      
      // Tentar formato brasileiro DD/MM/YYYY
      const brDateMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (brDateMatch) {
        const [, day, month, year] = brDateMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      // Tentar parse padrão
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date(); // Fallback para data atual
  }

  private mapRequestType(requestTypeStr: string): VacationRequestType {
    const upper = requestTypeStr.toUpperCase();

    if (upper.includes("PROGRAMAÇÃO") || upper.includes("PROGRAMACAO")) {
      return "PROGRAMACAO_DE_FERIAS";
    } else if (upper.includes("SOLICITAÇÃO") && upper.includes("GOZO")) {
      return "SOLICITACAO_DE_GOZO";
    } else if (upper.includes("ALTERAÇÃO") || upper.includes("ALTERACAO")) {
      return "ALTERACAO_DE_GOZO";
    } else if (upper.includes("SUSPENSÃO") || upper.includes("SUSPENSAO")) {
      return "SUSPENSAO_DE_GOZO";
    }

    return "PROGRAMACAO_DE_FERIAS"; // Default
  }

  private mapEffectiveEnjoyment(value?: string): EffectiveEnjoymentEnum {
    if (!value) return "NO";

    const upper = value.toUpperCase().trim();
    if (upper === "SIM" || upper === "YES") {
      return "YES";
    } else if (upper === "PARCIAL" || upper === "PARTIAL") {
      return "PARTIAL";
    }

    return "NO";
  }

  private extractDateRangeFromObservations(
    observations: string
  ): { startDate: Date; endDate: Date } | null {
    // Tentar encontrar padrão "DD/MM/YY - DD/MM/YY" ou "DD/MM/YYYY - DD/MM/YYYY"
    const dateRangePattern = /(\d{2}\/\d{2}\/\d{2,4})\s*-\s*(\d{2}\/\d{2}\/\d{2,4})/;
    const match = observations.match(dateRangePattern);

    if (match) {
      const startDateStr = match[1];
      const endDateStr = match[2];

      const startDate = this.parseDate(startDateStr);
      const endDate = this.parseDate(endDateStr);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }

    return null;
  }
}
```

---

## Passo 5: Criar o Controller de Importação

### 5.1. Atualizar o controller existente

**Arquivo:** `src/infra/http/controllers/import-data/index.ts`

Substitua o conteúdo atual por:

```typescript
import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportVacationSpreadsheetUseCase } from "@/domain/app/application/use-cases/import-vacation-spreadsheet";
import { Roles } from "@/infra/auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("/import-data")
export class ImportDataController {
  constructor(
    private importVacationSpreadsheetUseCase: ImportVacationSpreadsheetUseCase
  ) {}

  @Post("/vacation-spreadsheet")
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR])
  @UseInterceptors(FileInterceptor("file"))
  async importVacationSpreadsheet(
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("Arquivo não fornecido");
    }

    // Validar extensão do arquivo
    const allowedExtensions = [".xlsx", ".xls"];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        "Formato de arquivo inválido. Apenas arquivos Excel (.xlsx, .xls) são permitidos."
      );
    }

    const result = await this.importVacationSpreadsheetUseCase.execute({
      file,
    });

    if (result.isLeft()) {
      throw new BadRequestException(result.value.message);
    }

    return {
      message: "Importação concluída com sucesso",
      usersCreated: result.value.usersCreated,
      vacationsCreated: result.value.vacationsCreated,
      errors: result.value.errors,
    };
  }
}
```

---

## Passo 6: Registrar o Use Case no Módulo

### 6.1. Verificar o módulo de aplicação

**Arquivo:** Verifique onde os use cases são registrados (provavelmente em `src/infra/app.module.ts` ou um módulo de domínio)

Adicione o `ImportVacationSpreadsheetUseCase` aos providers:

```typescript
import { ImportVacationSpreadsheetUseCase } from "@/domain/app/application/use-cases/import-vacation-spreadsheet";

// No array de providers:
providers: [
  // ... outros providers
  ImportVacationSpreadsheetUseCase,
],
```

### 6.2. Verificar o módulo HTTP

**Arquivo:** `src/infra/http/http.module.ts`

Certifique-se de que o `ImportDataController` está registrado:

```typescript
import { ImportDataController } from "./controllers/import-data";

// No array de controllers:
controllers: [
  // ... outros controllers
  ImportDataController,
],
```

---

## Passo 7: Testar a Implementação

### 7.1. Criar um arquivo de teste

Crie uma planilha Excel de teste com:
- Planilha "LISTA SERVIDORES" com coluna NOME
- Abas ocultas com nomes dos usuários contendo as solicitações

### 7.2. Testar via API

Use uma ferramenta como Postman ou Insomnia para fazer uma requisição POST:

```
POST /import-data/vacation-spreadsheet
Content-Type: multipart/form-data

file: [seu arquivo Excel]
```

### 7.3. Verificar logs e erros

A resposta da API incluirá:
- `usersCreated`: Número de usuários criados
- `vacationsCreated`: Número de férias criadas
- `errors`: Array com erros encontrados durante o processamento

---

## Considerações Importantes

### Tratamento de Erros
- O sistema continua processando mesmo se houver erros em alguns usuários
- Todos os erros são coletados e retornados na resposta

### Geração de Email
- O email é gerado automaticamente a partir do nome
- Se um usuário já existir (mesmo email), as férias serão associadas ao usuário existente

### Senha Padrão
- Todos os usuários criados pela importação terão a senha "12345678"
- Considere implementar um fluxo de redefinição de senha

### Performance
- Para planilhas muito grandes, considere processar em lotes
- Pode ser necessário implementar processamento assíncrono com filas (Bull)

### Validações
- Valide se as datas estão no formato correto
- Valide se os tipos de solicitação são válidos
- Valide se os números são válidos

---

## Melhorias Futuras

1. **Processamento Assíncrono**: Usar Bull para processar planilhas grandes em background
2. **Validação de Dados**: Adicionar validações mais robustas antes de salvar
3. **Relatório Detalhado**: Retornar um relatório mais detalhado do que foi importado
4. **Rollback**: Implementar rollback em caso de erro crítico
5. **Preview**: Permitir visualizar os dados antes de importar
6. **Template**: Fornecer um template Excel para download

---

## Estrutura de Arquivos Criados/Modificados

```
src/
├── domain/
│   └── app/
│       └── application/
│           └── use-cases/
│               ├── import-vacation-spreadsheet.ts (NOVO)
│               └── register-user.ts (MODIFICADO)
├── infra/
│   └── http/
│       └── controllers/
│           └── import-data/
│               └── index.ts (MODIFICADO)
```

---

## Conclusão

Seguindo estes passos, você terá uma funcionalidade completa de importação de planilhas Excel de férias, mantendo os princípios de Clean Architecture e DDD. A implementação é robusta, trata erros adequadamente e fornece feedback detalhado sobre o processo de importação.

