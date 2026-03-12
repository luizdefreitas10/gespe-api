import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'

@Injectable()
export class ExcelReaderService {
  parseWorkbook(buffer: Buffer): XLSX.WorkBook {
    return XLSX.read(buffer, { type: 'buffer', cellStyles: true })
  }

  sheetToJson(sheet: XLSX.WorkSheet): unknown[][] {
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
    })
  }

  getCellValue(sheet: XLSX.WorkSheet, cellAddress: string): unknown {
    const cell = sheet[cellAddress]
    return cell?.v || null
  }

  getArrayCellValue(row: unknown[], index?: number): string | null {
    if (index === undefined) return null
    const value = row[index]
    return value ? value.toString() : null
  }

  hasSheet(workbook: XLSX.WorkBook, sheetName: string): boolean {
    return workbook.SheetNames.includes(sheetName)
  }

  getSheet(workbook: XLSX.WorkBook, sheetName: string): XLSX.WorkSheet | null {
    return workbook.Sheets[sheetName] || null
  }

  normalize(text: string | null | undefined): string {
    if (!text || typeof text !== 'string') {
      return ''
    }

    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  parseExcelDate(dateValue: unknown): Date {
    const parsedDate = this.tryParseExcelDate(dateValue)

    if (parsedDate) {
      return parsedDate
    }

    console.warn(
      `⚠️ Não foi possível parsear data: ${dateValue} (tipo: ${typeof dateValue})`,
    )
    return new Date()
  }

  tryParseExcelDate(dateValue: unknown): Date | null {
    if (dateValue instanceof Date) {
      return dateValue
    }

    if (typeof dateValue === 'number') {
      if (dateValue < 0 || dateValue > 100000) {
        console.warn(
          `⚠️ Data Excel inválida (número muito grande): ${dateValue}`,
        )
        return null
      }

      const excelEpoch = new Date(1899, 11, 30)
      const jsDate = new Date(
        excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000,
      )

      const year = jsDate.getFullYear()
      if (year < 1900 || year > 2100) {
        console.warn(
          `⚠️ Data resultante fora do range: ${jsDate.toISOString()} (valor Excel: ${dateValue})`,
        )
        return null
      }

      return jsDate
    }

    if (typeof dateValue === 'string') {
      const dateStr = dateValue.trim()

      const brDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
      if (brDateMatch) {
        let [, day, month, year] = brDateMatch

        if (year.length === 2) {
          const yearNum = parseInt(year)
          year = yearNum >= 0 && yearNum <= 30 ? `20${year}` : `19${year}`
        }

        const parsedDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        )

        if (!isNaN(parsedDate.getTime())) {
          return parsedDate
        }
      }

      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }

    return null
  }

  isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
