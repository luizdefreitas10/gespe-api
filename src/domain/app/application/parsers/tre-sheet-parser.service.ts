import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { EffectiveEnjoymentEnum, TreRequestType } from '@prisma/client'
import { ExcelReaderService } from './excel-reader.service'

export interface TreImportData {
  firstTreDay: Date
  lastTreDay: Date
  treSeiNumber: string | null
  requestType: TreRequestType
  yearOfAcquisition: number
  amoutOfTreDays: number
  observations: string | null
  effectiveEnjoyment: EffectiveEnjoymentEnum
}

export interface TreParseError {
  row: number
  reason: string
}

export interface TreParseResult {
  tres: TreImportData[]
  errors: TreParseError[]
}

interface TreHeaderMapping {
  requestDate?: number
  processNumber?: number
  documentNumber?: number
  requestType?: number
  yearOfAcquisition?: number
  amountOfDays?: number
  observations?: number
  effectiveEnjoyment?: number
}

@Injectable()
export class TreSheetParserService {
  constructor(private excelReader: ExcelReaderService) {}

  parseUserTres(workbook: XLSX.WorkBook, sheetName: string): TreParseResult {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      return {
        tres: [],
        errors: [],
      }
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
    const { headerRowIndex, headerMapping } = this.findTreHeader(data)

    if (headerRowIndex === -1) {
      return {
        tres: [],
        errors: [],
      }
    }

    const tres: TreImportData[] = []
    const errors: TreParseError[] = []

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i]

      if (!row || row.every((cell) => !cell || cell.toString().trim() === '')) {
        continue
      }

      try {
        const requestDateValue =
          headerMapping.requestDate !== undefined
            ? row[headerMapping.requestDate]
            : null

        const processNumber =
          headerMapping.processNumber !== undefined
            ? row[headerMapping.processNumber]
            : null

        const documentNumber =
          headerMapping.documentNumber !== undefined
            ? row[headerMapping.documentNumber]
            : null

        const requestTypeRaw =
          headerMapping.requestType !== undefined
            ? row[headerMapping.requestType]
            : null

        const yearRaw =
          headerMapping.yearOfAcquisition !== undefined
            ? row[headerMapping.yearOfAcquisition]
            : null

        const amountRaw =
          headerMapping.amountOfDays !== undefined
            ? row[headerMapping.amountOfDays]
            : null

        const observationsRaw =
          headerMapping.observations !== undefined
            ? row[headerMapping.observations]
            : null

        const effectiveEnjoymentRaw =
          headerMapping.effectiveEnjoyment !== undefined
            ? row[headerMapping.effectiveEnjoyment]
            : null

        if (!requestTypeRaw || yearRaw === null || amountRaw === null) {
          continue
        }

        const requestType = this.mapRequestType(requestTypeRaw.toString())
        const yearOfAcquisition = Number(yearRaw)
        const amoutOfTreDays = Number(amountRaw)

        if (isNaN(yearOfAcquisition) || isNaN(amoutOfTreDays)) {
          errors.push({
            row: i + 1,
            reason: 'Ano de aquisição ou quantidade de dias inválidos',
          })
          continue
        }

        const observations = observationsRaw ? observationsRaw.toString() : null
        const effectiveEnjoyment = this.mapEffectiveEnjoyment(
          effectiveEnjoymentRaw?.toString(),
        )

        const firstTreDay = this.resolveFirstTreDay(
          requestDateValue,
          observations,
        )
        if (!firstTreDay) {
          errors.push({
            row: i + 1,
            reason:
              'Data da solicitação inválida e sem data válida em observações',
          })
          continue
        }

        const lastTreDay =
          this.resolveLastTreDay(observations, firstTreDay) ?? firstTreDay

        const treSeiNumber = this.resolveTreSeiNumber(
          documentNumber,
          processNumber,
        )

        tres.push({
          firstTreDay,
          lastTreDay,
          treSeiNumber,
          requestType,
          yearOfAcquisition,
          amoutOfTreDays,
          observations,
          effectiveEnjoyment,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push({
          row: i + 1,
          reason: `Erro inesperado ao processar linha: ${errorMessage}`,
        })
      }
    }

    return { tres, errors }
  }

  private findTreHeader(data: unknown[][]): {
    headerRowIndex: number
    headerMapping: TreHeaderMapping
  } {
    let headerRowIndex = -1
    const headerMapping: TreHeaderMapping = {}

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i] as string[]

      const requestDateIndex = row.findIndex(
        (cell) =>
          cell &&
          this.excelReader.normalize(cell).includes('DATA DA SOLICITACAO'),
      )

      if (requestDateIndex === -1) continue

      headerRowIndex = i

      row.forEach((cell, index) => {
        if (!cell) return

        const normalized = this.excelReader.normalize(cell)

        if (normalized.includes('DATA DA SOLICITACAO')) {
          headerMapping.requestDate = index
        } else if (normalized.includes('N DO SEI')) {
          headerMapping.processNumber = index
        } else if (
          normalized.includes('DOCUMENTO') &&
          normalized.includes('SEI')
        ) {
          headerMapping.documentNumber = index
        } else if (
          normalized.includes('TIPO') &&
          normalized.includes('SOLICITACAO')
        ) {
          headerMapping.requestType = index
        } else if (
          normalized.includes('ANO AQUISICAO TRE') ||
          normalized.includes('ANO AQUISICAO')
        ) {
          headerMapping.yearOfAcquisition = index
        } else if (
          normalized.includes('QTDADE DE DIAS') ||
          normalized.includes('QUANTIDADE DE DIAS')
        ) {
          headerMapping.amountOfDays = index
        } else if (normalized.includes('OBSERVA')) {
          headerMapping.observations = index
        } else if (normalized.includes('GOZO EFETIVO')) {
          headerMapping.effectiveEnjoyment = index
        }
      })

      break
    }

    return { headerRowIndex, headerMapping }
  }

  private resolveTreSeiNumber(
    documentNumber: unknown,
    processNumber: unknown,
  ): string | null {
    if (documentNumber !== null && documentNumber !== undefined) {
      const value = documentNumber.toString().trim()
      if (value) return value
    }

    if (processNumber !== null && processNumber !== undefined) {
      const value = processNumber.toString().trim()
      if (value) return value
    }

    return null
  }

  private resolveFirstTreDay(
    requestDateValue: unknown,
    observations: string | null,
  ): Date | null {
    const parsedRequestDate =
      this.excelReader.tryParseExcelDate(requestDateValue)

    if (parsedRequestDate) {
      return parsedRequestDate
    }

    const datesFromObservation = this.extractDatesFromText(observations)
    if (datesFromObservation.length > 0) {
      return datesFromObservation[0]
    }

    return null
  }

  private resolveLastTreDay(
    observations: string | null,
    defaultDate: Date,
  ): Date | null {
    const datesFromObservation = this.extractDatesFromText(observations)
    if (datesFromObservation.length === 0) {
      return defaultDate
    }

    return datesFromObservation[datesFromObservation.length - 1]
  }

  private extractDatesFromText(text: string | null): Date[] {
    if (!text) {
      return []
    }

    const values = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) ?? []
    const dates: Date[] = []

    for (const value of values) {
      const parsed = this.excelReader.tryParseExcelDate(value)
      if (parsed) {
        dates.push(parsed)
      }
    }

    const numericFallback = this.excelReader.tryParseExcelDate(text)
    if (dates.length === 0 && numericFallback) {
      dates.push(numericFallback)
    }

    dates.sort((a, b) => a.getTime() - b.getTime())

    return dates
  }

  private mapRequestType(requestTypeRaw: string): TreRequestType {
    const normalized = this.excelReader.normalize(requestTypeRaw)

    if (normalized.includes('INCLUIR') && normalized.includes('SALDO')) {
      return 'INCLUIR_SALDO'
    }

    if (normalized.includes('CANCELAMENTO')) {
      return 'CANCELAMENTO_DE_GOZO'
    }

    return 'SOLICITACAO_DE_GOZO'
  }

  private mapEffectiveEnjoyment(value?: string): EffectiveEnjoymentEnum {
    if (!value) return 'NO'

    const normalized = this.excelReader.normalize(value)

    if (normalized === 'SIM') return 'YES'
    if (normalized === 'PARCIAL') return 'PARTIAL'

    return 'NO'
  }
}
