import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { VacationRequestType, EffectiveEnjoymentEnum } from '@prisma/client'
import { ExcelReaderService } from './excel-reader.service'

export interface VacationImportData {
  firstVacationDay: Date
  lastVacationDay: Date
  vacationSeiNumber: string | null
  requestType: VacationRequestType
  year: number
  amoutOfVacationDays: number
  observations: string | null
  effectiveEnjoyment: EffectiveEnjoymentEnum
}

export interface VacationParseError {
  row: number
  reason: string
}

export interface VacationParseResult {
  vacations: VacationImportData[]
  errors: VacationParseError[]
}

interface HeaderMapping {
  dataSolicitacao?: number
  documentNumber?: number
  requestType?: number
  year?: number
  amountOfDays?: number
  observations?: number
  effectiveEnjoyment?: number
}

@Injectable()
export class VacationSheetParserService {
  constructor(private excelReader: ExcelReaderService) {}

  parseUserVacations(
    workbook: XLSX.WorkBook,
    sheetName: string,
  ): VacationParseResult {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      return {
        vacations: [],
        errors: [],
      }
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
    const { headerRowIndex, headerMapping } = this.findVacationHeader(data)

    if (headerRowIndex === -1) {
      return {
        vacations: [],
        errors: [],
      }
    }

    const vacations: VacationImportData[] = []
    const errors: VacationParseError[] = []

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i]

      if (!row || row.every((cell) => !cell || cell.toString().trim() === '')) {
        continue
      }

      try {
        const dataSolicitacao =
          headerMapping.dataSolicitacao !== undefined
            ? row[headerMapping.dataSolicitacao]
            : null

        const documentNumber =
          headerMapping.documentNumber !== undefined
            ? row[headerMapping.documentNumber]
            : null

        const requestTypeStr =
          headerMapping.requestType !== undefined
            ? row[headerMapping.requestType]
            : null

        const year =
          headerMapping.year !== undefined ? row[headerMapping.year] : null

        const amountOfDays =
          headerMapping.amountOfDays !== undefined
            ? row[headerMapping.amountOfDays]
            : null

        const observations =
          headerMapping.observations !== undefined
            ? row[headerMapping.observations]
            : null

        const effectiveEnjoymentStr =
          headerMapping.effectiveEnjoyment !== undefined
            ? row[headerMapping.effectiveEnjoyment]
            : null

        if (!dataSolicitacao || !requestTypeStr || !year) {
          continue
        }

        const requestType = this.mapRequestType(requestTypeStr.toString())
        const yearNum = Number(year)
        const amountOfDaysNum = amountOfDays ? Number(amountOfDays) : 0
        const effectiveEnjoyment = this.mapEffectiveEnjoyment(
          effectiveEnjoymentStr?.toString(),
        )
        const observationsStr = observations?.toString() || null

        const isProgramacao = requestType === 'PROGRAMACAO_DE_FERIAS'
        const is30Days = amountOfDaysNum === 30

        if (isProgramacao && is30Days && observationsStr) {
          const dateRanges = this.extractMultipleDateRanges(observationsStr)

          if (dateRanges.length === 2) {
            console.log(`\n📅 Dividindo férias de 30 dias em 2 períodos:`)
            console.log(
              `   Período 1: ${dateRanges[0].startDate.toLocaleDateString()} - ${dateRanges[0].endDate.toLocaleDateString()}`,
            )
            console.log(
              `   Período 2: ${dateRanges[1].startDate.toLocaleDateString()} - ${dateRanges[1].endDate.toLocaleDateString()}`,
            )

            vacations.push({
              firstVacationDay: dateRanges[0].startDate,
              lastVacationDay: dateRanges[0].endDate,
              vacationSeiNumber: documentNumber?.toString() || null,
              requestType,
              year: yearNum,
              amoutOfVacationDays: 15,
              observations: observationsStr,
              effectiveEnjoyment,
            })

            vacations.push({
              firstVacationDay: dateRanges[1].startDate,
              lastVacationDay: dateRanges[1].endDate,
              vacationSeiNumber: documentNumber?.toString() || null,
              requestType,
              year: yearNum,
              amoutOfVacationDays: 15,
              observations: observationsStr,
              effectiveEnjoyment,
            })

            continue
          }
        }

        let firstVacationDay =
          this.excelReader.tryParseExcelDate(dataSolicitacao)
        let lastVacationDay = firstVacationDay

        if (observationsStr) {
          const dateRange =
            this.extractDateRangeFromObservations(observationsStr)
          if (dateRange) {
            if (!firstVacationDay) {
              firstVacationDay = dateRange.startDate
            }
            lastVacationDay = dateRange.endDate
          }
        }

        if (!firstVacationDay) {
          errors.push({
            row: i + 1,
            reason:
              'Data da solicitação inválida e sem intervalo de observação válido para inferência',
          })
          continue
        }

        const normalizedLastVacationDay = lastVacationDay ?? firstVacationDay

        vacations.push({
          firstVacationDay,
          lastVacationDay: normalizedLastVacationDay,
          vacationSeiNumber: documentNumber?.toString() || null,
          requestType,
          year: yearNum,
          amoutOfVacationDays: amountOfDaysNum,
          observations: observationsStr,
          effectiveEnjoyment,
        })
      } catch (error) {
        console.error(`Erro ao processar linha ${i + 1}:`, error)
        errors.push({
          row: i + 1,
          reason: `Erro inesperado ao processar linha: ${error instanceof Error ? error.message : String(error)}`,
        })
        continue
      }
    }

    return {
      vacations,
      errors,
    }
  }

  private findVacationHeader(data: unknown[][]): {
    headerRowIndex: number
    headerMapping: HeaderMapping
  } {
    let headerRowIndex = -1
    const headerMapping: HeaderMapping = {}

    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i] as string[]

      const dataSolicitacaoIndex = row.findIndex(
        (cell: string) =>
          cell &&
          this.excelReader.normalize(cell).includes('DATA DA SOLICITACAO'),
      )

      if (dataSolicitacaoIndex !== -1) {
        headerRowIndex = i

        row.forEach((cell: string, index: number) => {
          if (!cell) return

          const cellNormalized = this.excelReader.normalize(cell)

          if (cellNormalized.includes('DATA DA SOLICITACAO')) {
            headerMapping.dataSolicitacao = index
          } else if (
            cellNormalized.includes('DOCUMENTO') &&
            cellNormalized.includes('SEI')
          ) {
            headerMapping.documentNumber = index
          } else if (
            cellNormalized.includes('TIPO') &&
            cellNormalized.includes('SOLICITACAO')
          ) {
            headerMapping.requestType = index
          } else if (cellNormalized.includes('FERIAS EXERCICIO')) {
            headerMapping.year = index
          } else if (
            cellNormalized.includes('QUANTIDADE DE DIAS') ||
            cellNormalized.includes('QTDADE DE DIA')
          ) {
            headerMapping.amountOfDays = index
          } else if (
            cellNormalized.includes('OBSERVA') ||
            cell.toString().toUpperCase().includes('OBSERVA')
          ) {
            headerMapping.observations = index
          } else if (cellNormalized.includes('GOZO EFETIVO')) {
            headerMapping.effectiveEnjoyment = index
          }
        })

        break
      }
    }

    return { headerRowIndex, headerMapping }
  }

  private mapRequestType(requestTypeStr: string): VacationRequestType {
    const normalized = this.excelReader.normalize(requestTypeStr)

    if (normalized.includes('PROGRAMACAO')) {
      return 'PROGRAMACAO_DE_FERIAS'
    } else if (
      normalized.includes('SOLICITACAO') &&
      normalized.includes('GOZO')
    ) {
      return 'SOLICITACAO_DE_GOZO'
    } else if (normalized.includes('ALTERACAO')) {
      return 'ALTERACAO_DE_GOZO'
    } else if (normalized.includes('SUSPENSAO')) {
      return 'SUSPENSAO_DE_GOZO'
    }

    return 'PROGRAMACAO_DE_FERIAS'
  }

  private mapEffectiveEnjoyment(value?: string): EffectiveEnjoymentEnum {
    if (!value) return 'NO'

    const normalized = this.excelReader.normalize(value)

    if (normalized === 'SIM') {
      return 'YES'
    } else if (normalized === 'PARCIAL') {
      return 'PARTIAL'
    }

    return 'NO'
  }

  private extractDateRangeFromObservations(observations: string): {
    startDate: Date
    endDate: Date
  } | null {
    if (!observations || typeof observations !== 'string') {
      return null
    }

    const text = observations.trim()
    const dateRangePattern =
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:-|à|ate|até)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi

    const matches = Array.from(text.matchAll(dateRangePattern))

    if (matches.length === 0) {
      return null
    }

    const lastMatch = matches[matches.length - 1]

    const startDateStr = lastMatch[1]
    const endDateStr = lastMatch[2]

    try {
      const startDate = this.excelReader.parseExcelDate(startDateStr)
      const endDate = this.excelReader.parseExcelDate(endDateStr)

      const startYear = startDate.getFullYear()
      const endYear = endDate.getFullYear()

      if (
        !isNaN(startDate.getTime()) &&
        !isNaN(endDate.getTime()) &&
        startYear >= 2000 &&
        startYear <= 2030 &&
        endYear >= 2000 &&
        endYear <= 2030 &&
        endDate >= startDate
      ) {
        return { startDate, endDate }
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao parsear datas das observações: ${text}`, error)
    }

    return null
  }

  private extractMultipleDateRanges(observations: string): {
    startDate: Date
    endDate: Date
  }[] {
    if (!observations || typeof observations !== 'string') {
      return []
    }

    const text = observations.trim()

    const dateRangePattern =
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:-|à|ate|até)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi

    const matches = Array.from(text.matchAll(dateRangePattern))
    const ranges: { startDate: Date; endDate: Date }[] = []

    for (const match of matches) {
      try {
        const startDate = this.excelReader.parseExcelDate(match[1])
        const endDate = this.excelReader.parseExcelDate(match[2])

        const startYear = startDate.getFullYear()
        const endYear = endDate.getFullYear()

        if (
          !isNaN(startDate.getTime()) &&
          !isNaN(endDate.getTime()) &&
          startYear >= 2000 &&
          startYear <= 2030 &&
          endYear >= 2000 &&
          endYear <= 2030 &&
          endDate >= startDate
        ) {
          ranges.push({ startDate, endDate })
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao parsear período: ${match[0]}`, error)
        continue
      }
    }

    return ranges
  }
}
