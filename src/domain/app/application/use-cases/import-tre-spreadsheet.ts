import { Either, left, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { ExcelReaderService } from '../parsers/excel-reader.service'
import {
  TreUserExtractionError,
  TreUserSheetMatcherService,
} from '../parsers/tre-user-sheet-matcher.service'
import {
  TreParseResult,
  TreSheetParserService,
} from '../parsers/tre-sheet-parser.service'
import { UserRegistrationService } from '../../services/user/user-registration.service'
import { TreRegistrationService } from '../../services/tre/tre-registration.service'

interface ImportTreSpreadsheetRequest {
  file: Buffer
}

export interface ImportedTreUserSummary {
  fullName: string
  email: string | null
  sheetName: string | null
  status: 'CREATED' | 'ALREADY_EXISTS' | 'ERROR'
  reason: string
  tres: {
    created: number
    alreadyExisted: number
    errors: string[]
  }
}

export interface TreImportErrorDetail {
  fullName: string
  email: string
  sheetName: string
  row: number | null
  reason: string
  type: 'PARSE' | 'CREATE'
}

interface ImportTreResult {
  totalUsersInSpreadsheet: number
  processedUsers: number
  usersCreated: number
  usersAlreadyExisted: number
  usersWithErrors: number
  tresCreated: number
  tresAlreadyExisted: number
  tresWithErrors: number
  treErrors: TreImportErrorDetail[]
  extractionErrors: TreUserExtractionError[]
  users: ImportedTreUserSummary[]
}

type ImportTreSpreadsheetResponse = Either<Error, ImportTreResult>

@Injectable()
export class ImportTreSpreadsheetUseCase {
  constructor(
    private excelReader: ExcelReaderService,
    private treUserSheetMatcher: TreUserSheetMatcherService,
    private treSheetParser: TreSheetParserService,
    private userRegistration: UserRegistrationService,
    private treRegistration: TreRegistrationService,
  ) {}

  async execute({
    file,
  }: ImportTreSpreadsheetRequest): Promise<ImportTreSpreadsheetResponse> {
    try {
      const workbook = this.excelReader.parseWorkbook(file)

      const mainSheetName = 'LISTA SERVIDORES'
      const mainSheet = workbook.Sheets[mainSheetName]

      if (!mainSheet) {
        return left(new Error(`Planilha "${mainSheetName}" não encontrada`))
      }

      const extractionResult =
        this.treUserSheetMatcher.extractUsersFromMainSheet(
          workbook,
          mainSheetName,
        )

      const users: ImportedTreUserSummary[] = extractionResult.errors.map(
        (error) => ({
          fullName: error.fullName,
          email: null,
          sheetName: null,
          status: 'ERROR',
          reason: error.reason,
          tres: {
            created: 0,
            alreadyExisted: 0,
            errors: [],
          },
        }),
      )

      let usersCreated = 0
      let usersAlreadyExisted = 0
      let usersWithErrors = extractionResult.errors.length
      let tresCreated = 0
      let tresAlreadyExisted = 0
      let tresWithErrors = 0
      const treErrors: TreImportErrorDetail[] = []

      for (const userMatch of extractionResult.users) {
        try {
          const registerResult =
            await this.userRegistration.registerIfNotExists({
              fullName: userMatch.fullName,
              email: userMatch.email,
              password: '12345678',
            })

          if (registerResult.isLeft()) {
            usersWithErrors++
            users.push({
              fullName: userMatch.fullName,
              email: userMatch.email,
              sheetName: userMatch.sheetName,
              status: 'ERROR',
              reason: `Erro ao criar usuário: ${registerResult.value.message}`,
              tres: {
                created: 0,
                alreadyExisted: 0,
                errors: [],
              },
            })
            continue
          }

          const userId = registerResult.value.user.id.toString()
          const wasCreated = registerResult.value.wasCreated

          if (wasCreated) {
            usersCreated++
          } else {
            usersAlreadyExisted++
          }

          const treParsingResult: TreParseResult =
            this.treSheetParser.parseUserTres(workbook, userMatch.sheetName)

          const currentUserSummary: ImportedTreUserSummary = {
            fullName: userMatch.fullName,
            email: userMatch.email,
            sheetName: userMatch.sheetName,
            status: wasCreated ? 'CREATED' : 'ALREADY_EXISTS',
            reason: wasCreated
              ? 'Usuário criado com sucesso'
              : 'Usuário já existente no banco',
            tres: {
              created: 0,
              alreadyExisted: 0,
              errors: [],
            },
          }

          for (const parseError of treParsingResult.errors) {
            tresWithErrors++
            treErrors.push({
              fullName: userMatch.fullName,
              email: userMatch.email,
              sheetName: userMatch.sheetName,
              row: parseError.row,
              reason: parseError.reason,
              type: 'PARSE',
            })
            currentUserSummary.tres.errors.push(
              `Linha ${parseError.row}: ${parseError.reason}`,
            )
          }

          for (const treData of treParsingResult.tres) {
            const treResult = await this.treRegistration.createIfNotExists({
              userId,
              ...treData,
            })

            if (treResult.isLeft()) {
              tresWithErrors++
              treErrors.push({
                fullName: userMatch.fullName,
                email: userMatch.email,
                sheetName: userMatch.sheetName,
                row: null,
                reason: treResult.value.message,
                type: 'CREATE',
              })
              currentUserSummary.tres.errors.push(
                `Erro ao criar TRE: ${treResult.value.message}`,
              )
            } else if (treResult.value.wasCreated) {
              tresCreated++
              currentUserSummary.tres.created++
            } else {
              tresAlreadyExisted++
              currentUserSummary.tres.alreadyExisted++
            }
          }

          users.push(currentUserSummary)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          usersWithErrors++
          users.push({
            fullName: userMatch.fullName,
            email: userMatch.email,
            sheetName: userMatch.sheetName,
            status: 'ERROR',
            reason: `Erro ao processar usuário: ${errorMessage}`,
            tres: {
              created: 0,
              alreadyExisted: 0,
              errors: [`Erro ao processar usuário: ${errorMessage}`],
            },
          })
        }
      }

      return right({
        totalUsersInSpreadsheet:
          extractionResult.users.length + extractionResult.errors.length,
        processedUsers: extractionResult.users.length,
        usersCreated,
        usersAlreadyExisted,
        usersWithErrors,
        tresCreated,
        tresAlreadyExisted,
        tresWithErrors,
        treErrors,
        extractionErrors: extractionResult.errors,
        users,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      return left(
        new Error(`Erro ao processar planilha de TRE: ${errorMessage}`),
      )
    }
  }
}
