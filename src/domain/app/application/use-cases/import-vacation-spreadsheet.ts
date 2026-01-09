import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { UserRepository } from "../repositories/user-repository";
import { VacationRepository } from "../repositories/vacation-repository";
import { RegisterUserUseCase } from "./register-user";
import { RegisterVacationUseCase } from "./register-vacation";
import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { VacationRequestType, EffectiveEnjoymentEnum } from "@prisma/client";
import { Multer } from 'multer';
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
        const workbook = XLSX.read(file.buffer, { type: "buffer", cellStyles: true });

        let mainSheetName = "LISTA SERVIDORES";
        let mainSheet = workbook.Sheets[mainSheetName];
        
        if (!mainSheet) {
        mainSheetName = workbook.SheetNames[0];
        mainSheet = workbook.Sheets[mainSheetName];
        }

        if (!mainSheet) {
        return left(new Error(`Nenhuma planilha encontrada no arquivo`));
        }

        const mainData = XLSX.utils.sheet_to_json(mainSheet, { 
        header: 1,
        defval: null,
        blankrows: true
        });

        let nomeColumnIndex = -1;
        let dataStartRowIndex = -1;

        for (let rowIdx = 0; rowIdx < Math.min(5, mainData.length); rowIdx++) {
        const row = mainData[rowIdx] as any[];
        
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx];
            
            if (cell) {
            const cellStr = cell.toString()
                .toUpperCase()
                .trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            
            if (cellStr === 'NOME' || cellStr.includes('NOME')) {
                nomeColumnIndex = colIdx;
                dataStartRowIndex = rowIdx + 1;
                
                if (rowIdx + 1 < mainData.length) {
                const nextRow = mainData[rowIdx + 1] as any[];
                const nextCell = nextRow[colIdx];
                
                if (!nextCell || nextCell.toString().toUpperCase().includes('NOME')) {
                    dataStartRowIndex = rowIdx + 2;
                }
                }
                
                break;
            }
            }
        }
        
        if (nomeColumnIndex !== -1) break;
        }

        if (nomeColumnIndex === -1) {
            return left(new Error('Coluna "NOME" não encontrada na planilha'));
        }

        const usersCreated: string[] = [];
        const vacationsCreated: number[] = [];
        const errors: string[] = [];

        for (let i = dataStartRowIndex; i < mainData.length; i++) {
            const row = mainData[i] as any[];
            const fullName = row[nomeColumnIndex];

            if (!fullName || !fullName.toString().trim()) {
                continue;
            }

            const nameStr = fullName.toString().trim();

            try {
                const userSheetName = this.findUserSheetName(workbook, nameStr);
                
                if (!userSheetName) {
                errors.push(`Aba não encontrada para o usuário: ${nameStr}`);
                continue;
                }

                const userSheet = workbook.Sheets[userSheetName];
                
                const emailCell = userSheet['B9'];
                
                if (!emailCell || !emailCell.v) {
                errors.push(`Email não encontrado na célula B9 para o usuário: ${nameStr}`);
                continue;
                }

                const email = emailCell.v.toString().trim();

                if (!this.isValidEmail(email)) {
                  errors.push(`Email inválido na célula B9 para ${nameStr}: ${email}`);
                  continue;
                }

                const existingUser = await this.userRepository.findByEmail(email);

                let userId: string;

                if (existingUser) {
                  userId = existingUser.id.toString();
                } else {
                  const password = "12345678";

                  const result = await this.registerUserUseCase.execute({
                      fullName: nameStr,
                      email,
                      password,
                });

                if (result.isLeft()) {
                    errors.push(`Erro ao criar usuário ${nameStr}: ${result.value.message}`);
                    continue;
                }

                userId = result.value.user.id.toString();
                usersCreated.push(userId);
                }

                const vacationCount = await this.processUserVacations(
                userSheet,
                userId,
                errors
                );
                vacationsCreated.push(vacationCount);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`Erro ao processar usuário ${nameStr}: ${errorMessage}`);
            }
            }


        return right({
        usersCreated: usersCreated.length,
        vacationsCreated: vacationsCreated.reduce((sum, count) => sum + count, 0),
        errors,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return left(new Error(`Erro ao processar planilha: ${errorMessage}`));
    }
    }

  private findUserSheetName(workbook: XLSX.WorkBook, fullName: string): string | null {
    const sheetNames = workbook.SheetNames;
    const normalizedFullName = this.normalizeString(fullName);
    
    console.log(`🔍 Buscando aba para: "${fullName}"`);
    console.log(`   Normalizado: "${normalizedFullName}"`);
    console.log(`📋 Total de abas: ${sheetNames.length}`);
    
    let found = sheetNames.find(name => {
        const normalizedSheet = this.normalizeString(name);
        return normalizedSheet === normalizedFullName;
    });
    
    if (found) {
        return found;
    }
    
    const nameParts = normalizedFullName.split(' ').filter(part => part.length > 0);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    if (nameParts.length >= 2) {
    found = sheetNames.find(name => {
        const normalizedSheet = this.normalizeString(name);
        const sheetParts = normalizedSheet.split(' ');
        
        const hasExactFirstName = sheetParts.includes(firstName);
        const hasLastName = normalizedSheet.includes(lastName);
        
        return hasExactFirstName && hasLastName;
    });
    
    if (found) {
        return found;
    }
    }
    
    let bestMatch: { name: string; score: number; matchedWords: string[] } | null = null;
    
    for (const sheetName of sheetNames) {
        const normalizedSheet = this.normalizeString(sheetName);
        const sheetParts = normalizedSheet.split(' ').filter(part => part.length > 0);
        
        let score = 0;
        const matchedWords: string[] = [];
        
        for (const namePart of nameParts) {
        if (namePart.length <= 2) continue;
        
        if (sheetParts.includes(namePart)) {
            score++;
            matchedWords.push(namePart);
        }
        }
        
        if (score >= 2) {
        if (!bestMatch || score > bestMatch.score) {
            bestMatch = { name: sheetName, score, matchedWords };
        }
        }
    }
    
    if (bestMatch) {
        return bestMatch.name;
    }
    
    let longestMatch: { name: string; length: number } | null = null;
    
    for (const sheetName of sheetNames) {
        const normalizedSheet = this.normalizeString(sheetName);
        
        const commonLength = this.getLongestCommonSubstring(normalizedFullName, normalizedSheet).length;
        
        if (commonLength >= 8) {
        if (!longestMatch || commonLength > longestMatch.length) {
            longestMatch = { name: sheetName, length: commonLength };
        }
        }
    }
    
    if (longestMatch) {
        return longestMatch.name;
    }
    
    return null;
    }

    private getLongestCommonSubstring(str1: string, str2: string): string {
    const matrix: number[][] = [];
    let maxLength = 0;
    let endIndex = 0;

    for (let i = 0; i <= str1.length; i++) {
        matrix[i] = [];
        for (let j = 0; j <= str2.length; j++) {
        if (i === 0 || j === 0) {
            matrix[i][j] = 0;
        } else if (str1[i - 1] === str2[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1] + 1;
            if (matrix[i][j] > maxLength) {
            maxLength = matrix[i][j];
            endIndex = i;
            }
        } else {
            matrix[i][j] = 0;
        }
        }
    }

    return str1.substring(endIndex - maxLength, endIndex);
    }


    private async processUserVacations(
    sheet: XLSX.WorkSheet,
    userId: string,
    errors: string[]
  ): Promise<number> {
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

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

    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i] as any[];

        if (
        !row ||
        row.every((cell) => !cell || cell.toString().trim() === "")
        ) {
        continue;
        }

        try {
        const dataSolicitacao = row[headerMapping.dataSolicitacao];
        const seiNumber = row[headerMapping.seiNumber];
        const requestTypeStr = row[headerMapping.requestType];
        const year = row[headerMapping.year];
        const amountOfDays = row[headerMapping.amountOfDays];
        const observations = row[headerMapping.observations];
        const effectiveEnjoymentStr = row[headerMapping.effectiveEnjoyment];

        if (!dataSolicitacao || !requestTypeStr || !year) {
            continue;
        }

        const firstVacationDay = this.parseDate(dataSolicitacao);
        let lastVacationDay = firstVacationDay;
        
        if (observations) {
            const dateRange = this.extractDateRangeFromObservations(
            observations.toString()
            );
            if (dateRange) {
            lastVacationDay = dateRange.endDate;
            }
        }
        
        const requestType = this.mapRequestType(requestTypeStr.toString());
        const yearNum = Number(year);
        const amountOfDaysNum = amountOfDays ? Number(amountOfDays) : 0;
        const effectiveEnjoyment = this.mapEffectiveEnjoyment(
            effectiveEnjoymentStr?.toString()
        );

        const result = await this.registerVacationUseCase.execute({
            userId: new UniqueEntityID(userId),
            firstVacationDay,
            lastVacationDay,
            vacationSeiNumber: seiNumber?.toString() || null,
            requestType,
            year: yearNum,
            amoutOfVacationDays: amountOfDaysNum,
            observations: observations?.toString() || null,
            effectiveEnjoyment,
        });

        if (result.isLeft()) {
            errors.push(`Erro ao criar férias para usuário ${userId}: ${result.value.message}`);
        } else {
            vacationCount++;
        }

        } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Erro ao processar linha ${i + 1}: ${errorMessage}`);
        }
    }

    return vacationCount;
  }


  private parseDate(dateValue: any): Date {
    if (dateValue instanceof Date) {
      return dateValue;
    }

    if (typeof dateValue === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(
        excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000
      );
      return jsDate;
    }

    if (typeof dateValue === "string") {
      const dateStr = dateValue.trim();
      
      const brDateMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (brDateMatch) {
        const [, day, month, year] = brDateMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date(); 
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

    return "PROGRAMACAO_DE_FERIAS";
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

  private normalizeString(str: string): string {
    return str
        .toUpperCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
    }

  private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

}