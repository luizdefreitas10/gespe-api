import { Either, left, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { ExcelReaderService } from '../parsers/excel-reader.service'
import { UserSheetMatcherService } from '../parsers/user-sheet-matcher.service'
import { TreSheetParserService } from '../parsers/tre-sheet-parser.service'
import { RegisterTreUseCase } from './register-tre'
import { UserRepository } from '../repositories/user-repository'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

interface ImportTreSpreadsheetUseCaseRequest {
  file: Buffer
}

type ImportTreSpreadsheetUseCaseResponse = Either<
  Error,
  {
    tresCreated: number
    errors: string[]
  }
>

const MAIN_SHEET_NAME = 'LISTA SERVIDORES'
const NAME_COLUMN_INDEX = 0
const DATA_START_ROW = 1

@Injectable()
export class ImportTreSpreadsheetUseCase {
  constructor(
    private excelReader: ExcelReaderService,
    private userSheetMatcher: UserSheetMatcherService,
    private treSheetParser: TreSheetParserService,
    private registerTreUseCase: RegisterTreUseCase,
    private userRepository: UserRepository,
  ) {}

  async execute({
    file,
  }: ImportTreSpreadsheetUseCaseRequest): Promise<ImportTreSpreadsheetUseCaseResponse> {
    try {
      const workbook = this.excelReader.parseWorkbook(file)

      if (!this.excelReader.hasSheet(workbook, MAIN_SHEET_NAME)) {
        return left(new Error(`Aba "${MAIN_SHEET_NAME}" não encontrada na planilha`))
      }

      const fullNames = this.extractNamesFromMainSheet(workbook)

      if (fullNames.length === 0) {
        return left(new Error('Nenhum nome encontrado na aba LISTA SERVIDORES'))
      }

      console.log(`\n📋 ${fullNames.length} nome(s) encontrado(s) na aba LISTA SERVIDORES`)

      let tresCreated = 0
      const errors: string[] = []

      for (const fullName of fullNames) {
        try {
          console.log(`\n👤 Processando: ${fullName}`)

          const user = await this.userRepository.findByFullName(fullName)

          if (!user) {
            const errorMsg = `Usuário não encontrado no banco: "${fullName}"`
            console.warn(`   ⚠️  ${errorMsg}`)
            errors.push(errorMsg)
            continue
          }

          console.log(`   ✔️  Usuário encontrado: ${fullName}`)

          const sheetName = this.userSheetMatcher.findUserSheet(workbook, fullName)

          if (!sheetName) {
            const errorMsg = `Aba individual não encontrada na planilha para: "${fullName}"`
            console.warn(`   ⚠️  ${errorMsg}`)
            errors.push(errorMsg)
            continue
          }

          const treRecords = this.treSheetParser.parseUserTres(workbook, sheetName)
          console.log(`   📋 ${treRecords.length} registro(s) TRE encontrado(s)`)

          for (const treData of treRecords) {
            try {
              await this.registerTreUseCase.execute({
                userId: new UniqueEntityID(user.id.toString()),
                firstTreDay: treData.firstTreDay,
                lastTreDay: treData.lastTreDay,
                treSeiNumber: treData.treSeiNumber,
                requestType: treData.requestType,
                yearOfAcquisition: treData.yearOfAcquisition,
                amoutOfTreDays: treData.amoutOfTreDays,
                observations: treData.observations,
                effectiveEnjoyment: treData.effectiveEnjoyment,
              })

              tresCreated++
            } catch (error) {
              const errorMsg = `Erro ao registrar TRE de "${fullName}": ${error instanceof Error ? error.message : String(error)}`
              console.error(`   ❌ ${errorMsg}`)
              errors.push(errorMsg)
            }
          }

          console.log(`   ✅ ${treRecords.length} registro(s) TRE processado(s)`)
        } catch (error) {
          const errorMsg = `Erro ao processar "${fullName}": ${error instanceof Error ? error.message : String(error)}`
          console.error(`   ❌ ${errorMsg}`)
          errors.push(errorMsg)
        }
      }

      if (errors.length > 0) {
        console.warn(`\n⚠️  ERROS DURANTE A IMPORTAÇÃO (${errors.length}):`)
        errors.forEach((e) => console.warn(`   - ${e}`))
      }

      console.log(`\n✅ Importação TRE concluída: ${tresCreated} registro(s) criado(s)`)

      return right({ tresCreated, errors })
    } catch (error) {
      return left(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private extractNamesFromMainSheet(workbook: XLSX.WorkBook): string[] {
    const sheet = this.excelReader.getSheet(workbook, MAIN_SHEET_NAME)
    if (!sheet) return []

    const data = this.excelReader.sheetToJson(sheet) as any[][]
    const names: string[] = []

    for (let i = DATA_START_ROW; i < data.length; i++) {
      const row = data[i]
      const nameCell = row?.[NAME_COLUMN_INDEX]

      if (nameCell && nameCell.toString().trim()) {
        names.push(nameCell.toString().trim())
      }
    }

    return names
  }
}