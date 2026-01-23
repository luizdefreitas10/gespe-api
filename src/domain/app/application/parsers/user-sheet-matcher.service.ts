import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { ExcelReaderService } from './excel-reader.service'

export interface UserSheetMatch {
  fullName: string
  email: string
  sheetName: string
}

export interface ExtractionResult {
  users: UserSheetMatch[]
  errors: string[]
}

@Injectable()
export class UserSheetMatcherService {
  constructor(private excelReader: ExcelReaderService) {}

  findUserSheet(workbook: XLSX.WorkBook, fullName: string): string | null {
    const sheetNames = workbook.SheetNames
    const normalizedFullName = this.excelReader.normalize(fullName)
        
    let found = sheetNames.find(name => 
      this.excelReader.normalize(name) === normalizedFullName
    )
    
    if (found) {
      return found
    }
    
    const nameParts = normalizedFullName.split(' ').filter(part => part.length > 0)
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]

    if (nameParts.length >= 2) {
      found = sheetNames.find(name => {
        const normalizedSheet = this.excelReader.normalize(name)
        const sheetParts = normalizedSheet.split(' ')
        
        return sheetParts.includes(firstName) && normalizedSheet.includes(lastName)
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
    
    let longestMatch: { name: string; length: number } | null = null
    
    for (const sheetName of sheetNames) {
      const normalizedSheet = this.excelReader.normalize(sheetName)
      const commonLength = this.getLongestCommonSubstring(normalizedFullName, normalizedSheet).length
      
      if (commonLength >= 8) {
        if (!longestMatch || commonLength > longestMatch.length) {
          longestMatch = { name: sheetName, length: commonLength }
        }
      }
    }
    
    if (longestMatch) {
      return longestMatch.name
    }
    
    console.warn(`   ⚠️  NENHUMA ABA ENCONTRADA para: ${fullName}`)
    return null
  }

  extractUsersFromMainSheet(
    workbook: XLSX.WorkBook,
    mainSheetName: string
  ): ExtractionResult {
    const mainSheet = this.excelReader.getSheet(workbook, mainSheetName)
    if (!mainSheet) {
      throw new Error(`Planilha "${mainSheetName}" não encontrada`)
    }

    const data = this.excelReader.sheetToJson(mainSheet)
    const users: UserSheetMatch[] = []
    const errors: string[] = []

    const { nomeColumnIndex, dataStartRowIndex } = this.findNameColumn(data)

    if (nomeColumnIndex === -1) {
      throw new Error('Coluna "NOME" não encontrada')
    }

    for (let i = dataStartRowIndex; i < data.length; i++) {
      const row = data[i] as any[]
      const fullName = row[nomeColumnIndex]

      if (!fullName || !fullName.toString().trim()) continue

      const nameStr = fullName.toString().trim()
      
      try {
        const userSheetName = this.findUserSheet(workbook, nameStr)
        
        if (!userSheetName) {
          const errorMsg = `Aba não encontrada para o usuário: ${nameStr}`
          console.warn(`   ⚠️  ${errorMsg}`)
          errors.push(errorMsg)
          continue
        }

        const userSheet = this.excelReader.getSheet(workbook, userSheetName)
        if (!userSheet) {
          const errorMsg = `Erro ao abrir aba para o usuário: ${nameStr}`
          console.warn(`   ⚠️  ${errorMsg}`)
          errors.push(errorMsg)
          continue
        }

        const emailValue = this.excelReader.getCellValue(userSheet, 'B9')
        
        if (!emailValue) {
          const errorMsg = `Erro ao ler o email do usuário: ${nameStr}`
          errors.push(errorMsg)
          continue
        }

        const email = emailValue.toString().trim()
        
        if (!this.excelReader.isValidEmail(email)) {
          const errorMsg = `Email inválido na célula B9 para ${nameStr}: ${email}`
          console.warn(`   ⚠️  ${errorMsg}`)
          errors.push(errorMsg)
          continue
        }

        users.push({
          fullName: nameStr,
          email: email,
          sheetName: userSheetName,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorMsg = `Erro ao processar usuário ${nameStr}: ${errorMessage}`
        console.error(`   ❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    if (errors.length > 0) {
      console.warn(`\n⚠️  USUÁRIOS NÃO PROCESSADOS (${errors.length}):`)
      errors.forEach(error => {
        console.warn(`   - ${error}`)
      })
    }

    return { users, errors }
  }

  private findNameColumn(data: any[]): { nomeColumnIndex: number; dataStartRowIndex: number } {
    let nomeColumnIndex = -1
    let dataStartRowIndex = -1

    for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
      const row = data[rowIdx] as any[]
      
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx]
        
        if (cell) {
          const cellStr = this.excelReader.normalize(cell.toString())
          
          if (cellStr === 'NOME' || cellStr.includes('NOME')) {
            nomeColumnIndex = colIdx
            dataStartRowIndex = rowIdx + 1
            
            if (rowIdx + 1 < data.length) {
              const nextRow = data[rowIdx + 1] as any[]
              const nextCell = nextRow[colIdx]
              
              if (!nextCell || nextCell.toString().toUpperCase().includes('NOME')) {
                dataStartRowIndex = rowIdx + 2
              }
            }
            break
          }
        }
      }
      
      if (nomeColumnIndex !== -1) break
    }

    return { nomeColumnIndex, dataStartRowIndex }
  }

  private getLongestCommonSubstring(str1: string, str2: string): string {
    const matrix: number[][] = []
    let maxLength = 0
    let endIndex = 0

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = []
      for (let j = 0; j <= str2.length; j++) {
        if (i === 0 || j === 0) {
          matrix[i][j] = 0
        } else if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1
          if (matrix[i][j] > maxLength) {
            maxLength = matrix[i][j]
            endIndex = i
          }
        } else {
          matrix[i][j] = 0
        }
      }
    }

    return str1.substring(endIndex - maxLength, endIndex)
  }
}