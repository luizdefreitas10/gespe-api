import * as XLSX from 'xlsx'
import { ImportVacationSpreadsheetUseCase } from './import-vacation-spreadsheet'
import { ExcelReaderService } from '../parsers/excel-reader.service'
import { UserSheetMatcherService } from '../parsers/user-sheet-matcher.service'
import { VacationSheetParserService } from '../parsers/vacation-sheet-parser.service'
import { UserRegistrationService } from '../../services/user/user-registration.service'
import { VacationRegistrationService } from '../../services/vacation/vacation-registration.service'
import { UserRepository } from '../repositories/user-repository'
import {
  FindDuplicateVacationParams,
  VacationRepository,
} from '../repositories/vacation-repository'
import { User } from '../../enterprise/entities/user'
import { Vacation } from '../../enterprise/entities/vacation'
import { PaginationParams } from '@/core/repositories/pagination-params'
import { HashGenerator } from '../cryptography/hash-generator'

class FakeHashGenerator implements HashGenerator {
  async hash(plain: string): Promise<string> {
    return `hashed-${plain}`
  }
}

class InMemoryUserRepository extends UserRepository {
  public items: User[] = []

  async createUser(user: User): Promise<void> {
    this.items.push(user)
  }

  async findById(userId: string): Promise<User | null> {
    return this.items.find((item) => item.id.toString() === userId) ?? null
  }

  async getAllUsers(_params: PaginationParams): Promise<User[]> {
    const { page, size } = _params
    const take = size ?? 20
    const skip = (page - 1) * take
    return this.items.slice(skip, skip + take)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.items.find((item) => item.email === email) ?? null
  }

  async updateUser(user: User): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.id.toString() === user.id.toString(),
    )
    if (index < 0) return
    this.items[index] = user
  }

  async updateTotalTreDays(
    userId: string,
    totalTreDays: number,
  ): Promise<void> {
    const user = this.items.find((item) => item.id.toString() === userId)
    if (!user) return

    user.totalTreDays = totalTreDays
  }

  async delete(user: User): Promise<void> {
    this.items = this.items.filter(
      (item) => item.id.toString() !== user.id.toString(),
    )
  }
}

class InMemoryVacationRepository extends VacationRepository {
  public items: Vacation[] = []

  async createVacation(vacation: Vacation): Promise<void> {
    this.items.push(vacation)
  }

  async findById(vacationId: string): Promise<Vacation | null> {
    return this.items.find((item) => item.id.toString() === vacationId) ?? null
  }

  async getAllVacations(_params: PaginationParams): Promise<Vacation[] | null> {
    const { page, size } = _params
    const take = size ?? 20
    const skip = (page - 1) * take
    return this.items.slice(skip, skip + take)
  }

  async findByUserId(
    userId: string,
    _params: PaginationParams,
  ): Promise<Vacation[] | null> {
    const { page, size } = _params
    const take = size ?? 20
    const skip = (page - 1) * take

    return this.items
      .filter((item) => item.userId.toString() === userId)
      .slice(skip, skip + take)
  }

  async findByYear(userId: string, year: number): Promise<Vacation[] | null> {
    return this.items.filter(
      (item) => item.userId.toString() === userId && item.year === year,
    )
  }

  async findDuplicateVacation(
    params: FindDuplicateVacationParams,
  ): Promise<Vacation | null> {
    return (
      this.items.find((item) => {
        return (
          item.userId.toString() === params.userId &&
          item.firstVacationDay.getTime() ===
            params.firstVacationDay.getTime() &&
          item.lastVacationDay.getTime() === params.lastVacationDay.getTime() &&
          item.requestType === params.requestType &&
          item.year === params.year &&
          item.amoutOfVacationDays === params.amoutOfVacationDays &&
          (item.vacationSeiNumber ?? null) ===
            (params.vacationSeiNumber ?? null)
        )
      }) ?? null
    )
  }

  async updateVacation(vacation: Vacation): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.id.toString() === vacation.id.toString(),
    )
    this.items[index] = vacation
  }

  async deleteVacation(vacationId: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toString() !== vacationId)
  }
}

function createWorkbookBuffer({
  userName,
  userEmail,
  includeUserSheet = true,
  vacationDateValue = '01/02/2026',
  vacationObservations = '01/03/2026 - 15/03/2026',
}: {
  userName: string
  userEmail: string
  includeUserSheet?: boolean
  vacationDateValue?: string
  vacationObservations?: string | null
}): Buffer {
  const workbook = XLSX.utils.book_new()

  const mainSheet = XLSX.utils.aoa_to_sheet([['NOME'], [userName]])
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'LISTA SERVIDORES')

  if (includeUserSheet) {
    const userRows = [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      ['', userEmail],
      [],
      [
        'DATA DA SOLICITACAO',
        'N DO DOCUMENTO (SEI)',
        'TIPO DA SOLICITACAO',
        'FERIAS EXERCICIO',
        'QUANTIDADE DE DIAS',
        'OBSERVACOES',
        'GOZO EFETIVO',
      ],
      [
        vacationDateValue,
        '12345',
        'PROGRAMACAO DE FERIAS',
        2026,
        15,
        vacationObservations,
        'SIM',
      ],
    ]

    const userSheet = XLSX.utils.aoa_to_sheet(userRows)
    XLSX.utils.book_append_sheet(workbook, userSheet, userName)
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

describe('Import vacation spreadsheet use case', () => {
  let usersRepository: InMemoryUserRepository
  let vacationRepository: InMemoryVacationRepository
  let sut: ImportVacationSpreadsheetUseCase

  beforeEach(() => {
    usersRepository = new InMemoryUserRepository()
    vacationRepository = new InMemoryVacationRepository()

    const excelReader = new ExcelReaderService()
    const matcher = new UserSheetMatcherService(excelReader)
    const parser = new VacationSheetParserService(excelReader)
    const userRegistration = new UserRegistrationService(
      usersRepository,
      new FakeHashGenerator(),
    )
    const vacationRegistration = new VacationRegistrationService(
      vacationRepository,
    )

    sut = new ImportVacationSpreadsheetUseCase(
      excelReader,
      matcher,
      parser,
      userRegistration,
      vacationRegistration,
    )
  })

  it('should create user and vacation from spreadsheet', async () => {
    const file = createWorkbookBuffer({
      userName: 'Ana Silva',
      userEmail: 'ana.silva@arpe.gov.br',
    })

    const result = await sut.execute({ file })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.usersCreated).toBe(1)
    expect(result.value.usersAlreadyExisted).toBe(0)
    expect(result.value.usersWithErrors).toBe(0)
    expect(result.value.vacationsCreated).toBe(1)
    expect(result.value.vacationsAlreadyExisted).toBe(0)
    expect(result.value.vacationsWithErrors).toBe(0)
    expect(result.value.vacationErrors).toHaveLength(0)
    expect(result.value.users[0].status).toBe('CREATED')
    expect(result.value.users[0].vacations.created).toBe(1)
  })

  it('should not create duplicated users or vacations', async () => {
    const file = createWorkbookBuffer({
      userName: 'Ana Silva',
      userEmail: 'ana.silva@arpe.gov.br',
    })

    const firstImport = await sut.execute({ file })
    const secondImport = await sut.execute({ file })

    expect(firstImport.isRight()).toBe(true)
    expect(secondImport.isRight()).toBe(true)
    if (secondImport.isLeft()) return

    expect(usersRepository.items).toHaveLength(1)
    expect(vacationRepository.items).toHaveLength(1)
    expect(secondImport.value.usersCreated).toBe(0)
    expect(secondImport.value.usersAlreadyExisted).toBe(1)
    expect(secondImport.value.vacationsCreated).toBe(0)
    expect(secondImport.value.vacationsAlreadyExisted).toBe(1)
    expect(secondImport.value.vacationErrors).toHaveLength(0)
    expect(secondImport.value.users[0].status).toBe('ALREADY_EXISTS')
  })

  it('should return detailed extraction errors when user data is invalid', async () => {
    const file = createWorkbookBuffer({
      userName: 'Servidor Sem Email',
      userEmail: 'email-invalido',
    })

    const result = await sut.execute({ file })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.totalUsersInSpreadsheet).toBe(1)
    expect(result.value.processedUsers).toBe(0)
    expect(result.value.usersCreated).toBe(0)
    expect(result.value.usersWithErrors).toBe(1)
    expect(result.value.extractionErrors).toHaveLength(1)
    expect(result.value.extractionErrors[0].fullName).toBe('Servidor Sem Email')
    expect(result.value.users[0].status).toBe('ERROR')
    expect(result.value.users[0].reason).toContain('Email inválido')
  })

  it('should not create vacations with invalid solicitation date without valid date range', async () => {
    const file = createWorkbookBuffer({
      userName: 'Maria Sandra Wanderley Rocha',
      userEmail: 'sandra.rocha@arpe.gov.br',
      vacationDateValue: 'XXXXX',
      vacationObservations: null,
    })

    const firstImport = await sut.execute({ file })
    const secondImport = await sut.execute({ file })

    expect(firstImport.isRight()).toBe(true)
    expect(secondImport.isRight()).toBe(true)
    if (firstImport.isLeft() || secondImport.isLeft()) return

    expect(firstImport.value.vacationsCreated).toBe(0)
    expect(secondImport.value.vacationsCreated).toBe(0)
    expect(vacationRepository.items).toHaveLength(0)
    expect(firstImport.value.vacationErrors).toHaveLength(1)
    expect(firstImport.value.vacationErrors[0].type).toBe('PARSE')
    expect(firstImport.value.vacationErrors[0].fullName).toBe(
      'Maria Sandra Wanderley Rocha',
    )
    expect(firstImport.value.users[0].vacations.errors[0]).toContain(
      'Data da solicitação inválida',
    )
  })
})
