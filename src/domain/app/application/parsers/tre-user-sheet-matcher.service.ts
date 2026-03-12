import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { ExcelReaderService } from './excel-reader.service'

export interface TreUserSheetMatch {
  fullName: string
  email: string
  sheetName: string
}

export interface TreUserExtractionError {
  fullName: string
  row: number
  reason: string
}

export interface TreExtractionResult {
  users: TreUserSheetMatch[]
  errors: TreUserExtractionError[]
}

@Injectable()
export class TreUserSheetMatcherService {
  constructor(private excelReader: ExcelReaderService) {}

  findUserSheet(workbook: XLSX.WorkBook, fullName: string): string | null {
    const sheetNames = workbook.SheetNames
    const normalizedFullName = this.excelReader.normalize(fullName)

    let found = sheetNames.find(
      (name) => this.excelReader.normalize(name) === normalizedFullName,
    )

    if (found) {
      return found
    }

    const nameParts = normalizedFullName
      .split(' ')
      .filter((part) => part.length > 0)
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]

    if (nameParts.length >= 2) {
      found = sheetNames.find((name) => {
        const normalizedSheet = this.excelReader.normalize(name)
        const sheetParts = normalizedSheet.split(' ')

        return (
          sheetParts.includes(firstName) && normalizedSheet.includes(lastName)
        )
      })

      if (found) {
        return found
      }
    }

    let bestMatch: { name: string; score: number } | null = null

    for (const sheetName of sheetNames) {
      const normalizedSheet = this.excelReader.normalize(sheetName)
      const sheetParts = normalizedSheet.split(' ')

      let score = 0

      for (const namePart of nameParts) {
        if (namePart.length <= 2) continue

        if (sheetParts.includes(namePart)) {
          score++
        }
      }

      if (score >= 2) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { name: sheetName, score }
        }
      }
    }

    if (bestMatch) {
      return bestMatch.name
    }

    return null
  }

  extractUsersFromMainSheet(
    workbook: XLSX.WorkBook,
    mainSheetName: string,
  ): TreExtractionResult {
    const mainSheet = this.excelReader.getSheet(workbook, mainSheetName)
    if (!mainSheet) {
      throw new Error(`Planilha "${mainSheetName}" não encontrada`)
    }

    const data = this.excelReader.sheetToJson(mainSheet)
    const users: TreUserSheetMatch[] = []
    const errors: TreUserExtractionError[] = []

    const { nomeColumnIndex, dataStartRowIndex } = this.findNameColumn(data)

    if (nomeColumnIndex === -1) {
      throw new Error('Coluna "NOME" não encontrada')
    }

    for (let i = dataStartRowIndex; i < data.length; i++) {
      const row = data[i] as unknown[]
      const fullName = row[nomeColumnIndex]

      if (!fullName || !fullName.toString().trim()) continue

      const nameStr = fullName.toString().trim()

      try {
        const userSheetName = this.findUserSheet(workbook, nameStr)

        if (!userSheetName) {
          errors.push({
            fullName: nameStr,
            row: i + 1,
            reason: 'Aba individual do usuário não encontrada na planilha',
          })
          continue
        }

        const userSheet = this.excelReader.getSheet(workbook, userSheetName)
        if (!userSheet) {
          errors.push({
            fullName: nameStr,
            row: i + 1,
            reason: 'Erro ao abrir aba individual do usuário',
          })
          continue
        }

        const email = this.extractEmailFromSheet(userSheet)

        if (!email) {
          errors.push({
            fullName: nameStr,
            row: i + 1,
            reason: 'Email não encontrado na aba do usuário',
          })
          continue
        }

        if (!this.excelReader.isValidEmail(email)) {
          errors.push({
            fullName: nameStr,
            row: i + 1,
            reason: `Email inválido na aba do usuário: ${email}`,
          })
          continue
        }

        users.push({
          fullName: nameStr,
          email,
          sheetName: userSheetName,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push({
          fullName: nameStr,
          row: i + 1,
          reason: `Erro interno ao extrair dados do usuário: ${errorMessage}`,
        })
      }
    }

    return { users, errors }
  }

  private extractEmailFromSheet(sheet: XLSX.WorkSheet): string | null {
    const data = this.excelReader.sheetToJson(sheet)

    for (let rowIndex = 0; rowIndex < Math.min(20, data.length); rowIndex++) {
      const row = data[rowIndex] as unknown[]

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cellValue = row[colIndex]
        if (!cellValue) continue

        const normalizedCell = this.excelReader.normalize(cellValue.toString())
        if (normalizedCell === 'EMAIL') {
          const possibleEmail = row[colIndex + 1]
          if (!possibleEmail) {
            return null
          }

          return possibleEmail.toString().trim()
        }
      }
    }

    return null
  }

  private findNameColumn(data: unknown[][]): {
    nomeColumnIndex: number
    dataStartRowIndex: number
  } {
    let nomeColumnIndex = -1
    let dataStartRowIndex = -1

    for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
      const row = data[rowIdx] as unknown[]

      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx]

        if (!cell) continue

        const cellStr = this.excelReader.normalize(cell.toString())

        if (cellStr === 'NOME' || cellStr.includes('NOME')) {
          nomeColumnIndex = colIdx
          dataStartRowIndex = rowIdx + 1
          break
        }
      }

      if (nomeColumnIndex !== -1) break
    }

    return { nomeColumnIndex, dataStartRowIndex }
  }
}
