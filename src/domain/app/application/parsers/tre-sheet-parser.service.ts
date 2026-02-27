import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { TreRequestType, EffectiveEnjoymentEnum } from '@prisma/client'
import { ExcelReaderService } from './excel-reader.service'

export interface TreImportData {
  firstTreDay: Date | null
  lastTreDay: Date | null
  treSeiNumber: string | null
  requestType: TreRequestType
  yearOfAcquisition: number
  amoutOfTreDays: number
  observations: string | null
  effectiveEnjoyment: EffectiveEnjoymentEnum
}

interface HeaderMapping {
  dataSolicitacao?: number
  seiNumber?: number
  requestType?: number
  yearOfAcquisition?: number
  amountOfDays?: number
  observations?: number
  effectiveEnjoyment?: number
}

interface DateGroup {
  firstTreDay: Date
  lastTreDay: Date
  days: number
  observationsStr: string
}

@Injectable()
export class TreSheetParserService {
  constructor(private excelReader: ExcelReaderService) {}

  parseUserTres(workbook: XLSX.WorkBook, sheetName: string): TreImportData[] {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return []

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
    const { headerRowIndex, headerMapping } = this.findTreHeader(data)

    if (headerRowIndex === -1) {
      console.warn(`⚠️ Cabeçalho TRE não encontrado na aba: ${sheetName}`)
      return []
    }

    const tres: TreImportData[] = []

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i]

      if (!row || row.every((cell) => !cell || cell.toString().trim() === '')) {
        continue
      }

      try {
        const dataSolicitacao = headerMapping.dataSolicitacao !== undefined
          ? row[headerMapping.dataSolicitacao]
          : null

        const seiNumber = headerMapping.seiNumber !== undefined
          ? this.normalizeCellToString(row[headerMapping.seiNumber])
          : null

        const requestTypeStr = headerMapping.requestType !== undefined
          ? this.normalizeCellToString(row[headerMapping.requestType])
          : null

        const yearOfAcquisition = headerMapping.yearOfAcquisition !== undefined
          ? row[headerMapping.yearOfAcquisition]
          : null

        const amountOfDays = headerMapping.amountOfDays !== undefined
          ? row[headerMapping.amountOfDays]
          : null

        const observationsRaw = headerMapping.observations !== undefined
          ? row[headerMapping.observations]
          : null

        const observationsStr = this.normalizeCellToString(observationsRaw)

        const effectiveEnjoymentStr = headerMapping.effectiveEnjoyment !== undefined
          ? this.normalizeCellToString(row[headerMapping.effectiveEnjoyment])
          : null

        if (!requestTypeStr || !yearOfAcquisition) continue

        const requestType = this.mapRequestType(requestTypeStr)
        const yearNum = Number(yearOfAcquisition)
        const amountOfDaysNum = amountOfDays ? Math.abs(Number(amountOfDays)) : 0
        const effectiveEnjoyment = this.mapEffectiveEnjoyment(effectiveEnjoymentStr ?? undefined)
        const treSeiNumber = seiNumber

        const isSolicitacaoDeGozo = requestType === TreRequestType.SOLICITACAO_DE_GOZO

        if (isSolicitacaoDeGozo && observationsStr) {
            const groups = this.groupConsecutiveDates(observationsStr)

          if (groups.length > 0) {
            console.log(`\n📅 SOLICITAÇÃO DE GOZO — ${groups.length} grupo(s):`)
            groups.forEach((g, idx) => {
              console.log(`   Grupo ${idx + 1}: ${g.firstTreDay.toLocaleDateString('pt-BR')} → ${g.lastTreDay.toLocaleDateString('pt-BR')} (${g.days} dia(s)) | obs: "${g.observationsStr}"`)
            })

            for (const group of groups) {
              tres.push({
                firstTreDay: group.firstTreDay,
                lastTreDay: group.lastTreDay,
                treSeiNumber,
                requestType,
                yearOfAcquisition: yearNum,
                amoutOfTreDays: group.days,
                observations: group.observationsStr,
                effectiveEnjoyment,
              })
            }

            continue
          }
        }

        const firstTreDay = dataSolicitacao
          ? this.excelReader.parseExcelDate(dataSolicitacao)
          : null

        tres.push({
          firstTreDay,
          lastTreDay: firstTreDay,
          treSeiNumber,
          requestType,
          yearOfAcquisition: yearNum,
          amoutOfTreDays: amountOfDaysNum,
          observations: observationsStr,
          effectiveEnjoyment,
        })
      } catch (error) {
        console.error(`Erro ao processar linha ${i + 1} da aba ${sheetName}:`, error)
        continue
      }
    }

    return tres
  }

  private groupConsecutiveDates(observations: string): DateGroup[] {
    if (!observations || typeof observations !== 'string') return []

    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g
    const matches = Array.from(observations.matchAll(datePattern))
    const dates: Date[] = []

    for (const match of matches) {
      try {
        const date = this.excelReader.parseExcelDate(match[1])
        const year = date.getFullYear()

        if (!isNaN(date.getTime()) && year >= 2000 && year <= 2100) {
          dates.push(date)
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao parsear data: ${match[1]}`, error)
      }
    }

    if (dates.length === 0) return []

    dates.sort((a, b) => a.getTime() - b.getTime())

    const groups: DateGroup[] = []
    let groupDates: Date[] = [dates[0]]

    for (let i = 1; i < dates.length; i++) {
      const diffDays =
        (dates[i].getTime() - groupDates[groupDates.length - 1].getTime()) /
        (1000 * 60 * 60 * 24)

      if (diffDays === 1) {
        groupDates.push(dates[i])
      } else {
        groups.push(this.buildGroup(groupDates))
        groupDates = [dates[i]]
      }
    }

    groups.push(this.buildGroup(groupDates))

    return groups
  }

  private buildGroup(dates: Date[]): DateGroup {
    const formatted = dates.map((d) => d.toLocaleDateString('pt-BR'))

    let observationsStr: string
    if (formatted.length === 1) {
      observationsStr = formatted[0]
    } else {
      const allButLast = formatted.slice(0, -1)
      const last = formatted[formatted.length - 1]
      observationsStr = `${allButLast.join(', ')} e ${last}`
    }

    return {
      firstTreDay: dates[0],
      lastTreDay: dates[dates.length - 1],
      days: dates.length,
      observationsStr,
    }
  }


  private findTreHeader(data: any[][]): {
    headerRowIndex: number
    headerMapping: HeaderMapping
  } {
    let headerRowIndex = -1
    const headerMapping: HeaderMapping = {}

    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i] as string[]

      const dataSolicitacaoIndex = row.findIndex(
        (cell) =>
          cell && this.excelReader.normalize(cell.toString()).includes('DATA DA SOLICITACAO'),
      )

      if (dataSolicitacaoIndex !== -1) {
        headerRowIndex = i

        row.forEach((cell, index) => {
          if (!cell) return

          const cellNormalized = this.excelReader.normalize(cell.toString())

          if (cellNormalized.includes('DATA DA SOLICITACAO')) {
            headerMapping.dataSolicitacao = index
          } else if (
            cellNormalized.includes('SEI') &&
            !cellNormalized.includes('DOCUMENTO')
          ) {
            if (headerMapping.seiNumber === undefined) {
              headerMapping.seiNumber = index
            }
          } else if (
            cellNormalized.includes('TIPO') &&
            cellNormalized.includes('SOLICITACAO')
          ) {
            headerMapping.requestType = index
          } else if (
            cellNormalized.includes('ANO') &&
            cellNormalized.includes('TRE')
          ) {
            headerMapping.yearOfAcquisition = index
          } else if (
            cellNormalized.includes('QTDADE') ||
            cellNormalized.includes('QUANTIDADE')
          ) {
            headerMapping.amountOfDays = index
          } else if (cellNormalized.includes('OBSERVA')) {
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

  private normalizeCellToString(value: any): string | null {
    if (value === null || value === undefined) return null

    if (typeof value === 'number') {
      if (value > 0 && value < 100000) {
        return this.excelReader.parseExcelDate(value).toLocaleDateString('pt-BR')
      }
      return value.toString()
    }

    const str = value.toString().trim()
    return str === '' ? null : str
  }

  private mapRequestType(requestTypeStr: string): TreRequestType {
    const normalized = this.excelReader.normalize(requestTypeStr)

    if (normalized.includes('INCLUIR') && normalized.includes('SALDO')) {
      return TreRequestType.INCLUIR_SALDO
    } else if (normalized.includes('SOLICITACAO') && normalized.includes('GOZO')) {
      return TreRequestType.SOLICITACAO_DE_GOZO
    } else if (normalized.includes('CANCELAMENTO')) {
      return TreRequestType.CANCELAMENTO_DE_GOZO
    }

    console.warn(`⚠️ Tipo de solicitação TRE não reconhecido: "${requestTypeStr}", usando INCLUIR_SALDO como fallback`)
    return TreRequestType.INCLUIR_SALDO
  }

  private mapEffectiveEnjoyment(value?: string): EffectiveEnjoymentEnum {
    if (!value) return EffectiveEnjoymentEnum.NO

    const normalized = this.excelReader.normalize(value)

    if (normalized === 'SIM') return EffectiveEnjoymentEnum.YES
    if (normalized === 'PARCIAL') return EffectiveEnjoymentEnum.PARTIAL

    return EffectiveEnjoymentEnum.NO
  }
}