import { Either, left, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { ExcelReaderService } from '../parsers/excel-reader.service'
import { UserSheetMatcherService } from '../parsers/user-sheet-matcher.service'
import { VacationSheetParserService, VacationImportData } from '../parsers/vacation-sheet-parser.service'
import { UserRegistrationService } from '../../services/user/user-registration.service'
import { VacationRegistrationService } from '../../services/vacation/vacation-registration.service'

interface ImportVacationSpreadsheetRequest {
  file: Buffer
}

interface ImportResult {
  usersCreated: number
  vacationsCreated: number
  errors: string[]
}

type ImportVacationSpreadsheetResponse = Either<Error, ImportResult>

@Injectable()
export class ImportVacationSpreadsheetUseCase {
  constructor(
    private excelReader: ExcelReaderService,
    private userSheetMatcher: UserSheetMatcherService,
    private vacationParser: VacationSheetParserService,
    private userRegistration: UserRegistrationService,
    private vacationRegistration: VacationRegistrationService,
  ) {}

  async execute({
    file,
  }: ImportVacationSpreadsheetRequest): Promise<ImportVacationSpreadsheetResponse> {
    try {
      const workbook = this.excelReader.parseWorkbook(file)

      const mainSheetName = 'LISTA SERVIDORES'
      const mainSheet = workbook.Sheets[mainSheetName]

      if (!mainSheet) {
        return left(new Error(`Planilha "${mainSheetName}" não encontrada`))
      }

      const extractionResult = this.userSheetMatcher.extractUsersFromMainSheet(
        workbook,
        mainSheetName,
      )

      if (extractionResult.errors.length > 0) {
        console.warn('Avisos durante extração:', extractionResult.errors)
      }

      let usersCreated = 0
      let vacationsCreated = 0
      const errors: string[] = []

      for (const userMatch of extractionResult.users) {

        try {
          const registerResult = await this.userRegistration.registerIfNotExists({
            fullName: userMatch.fullName,
            email: userMatch.email,
            password: '12345678',
          })

          if (registerResult.isLeft()) {
            errors.push(
              `Erro ao criar usuário ${userMatch.fullName}: ${registerResult.value.message}`,
            )
            continue
          }

          const userId = registerResult.value.user.id.toString()
          const wasCreated = registerResult.value.wasCreated

          if (wasCreated) {
            usersCreated++
          }

          const vacations: VacationImportData[] = this.vacationParser.parseUserVacations(
            workbook,
            userMatch.sheetName,
          )

          for (const vacationData of vacations) {
            const vacationResult = await this.vacationRegistration.create({
              userId,
              ...vacationData,
            })

            if (vacationResult.isLeft()) {
              errors.push(
                `Erro ao criar férias para ${userMatch.fullName}: ${vacationResult.value.message}`,
              )
            } else {
              vacationsCreated++
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          errors.push(`Erro ao processar ${userMatch.fullName}: ${errorMessage}`)
          console.error(`Erro: ${errorMessage}`)
        }
      }

      return right({
        usersCreated,
        vacationsCreated,
        errors,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return left(new Error(`Erro ao processar planilha: ${errorMessage}`))
    }
  }
}