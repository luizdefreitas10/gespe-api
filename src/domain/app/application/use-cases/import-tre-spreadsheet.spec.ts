import * as XLSX from 'xlsx'
import { ImportTreSpreadsheetUseCase } from './import-tre-spreadsheet'
import { ExcelReaderService } from '../parsers/excel-reader.service'
import { TreUserSheetMatcherService } from '../parsers/tre-user-sheet-matcher.service'
import { TreSheetParserService } from '../parsers/tre-sheet-parser.service'
import { UserRegistrationService } from '../../services/user/user-registration.service'
import { TreRegistrationService } from '../../services/tre/tre-registration.service'
import { TreBalanceSyncService } from '../../services/tre/tre-balance-sync.service'
import { UserRepository } from '../repositories/user-repository'
import { PaginationParams } from '@/core/repositories/pagination-params'
import { User } from '../../enterprise/entities/user'
import { HashGenerator } from '../cryptography/hash-generator'
import {
  TreRepository,
  FindDuplicateTreParams,
} from '../repositories/tre-repository'
import { Tre } from '../../enterprise/entities/tre'

class FakeHashGenerator implements HashGenerator {
  async hash(plain: string): Promise<string> {
    return `hashed-${plain}`
  }
}

class InMemoryUsersRepository extends UserRepository {
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

class InMemoryTreRepository extends TreRepository {
  public items: Tre[] = []

  async createTre(tre: Tre): Promise<void> {
    this.items.push(tre)
  }

  async findById(treId: string): Promise<Tre | null> {
    return this.items.find((item) => item.id.toString() === treId) ?? null
  }

  async getAllTres(_params: PaginationParams): Promise<Tre[] | null> {
    const { page, size } = _params
    const take = size ?? 20
    const skip = (page - 1) * take
    return this.items.slice(skip, skip + take)
  }

  async findByUserId(
    userId: string,
    pagination?: PaginationParams,
  ): Promise<Tre[] | null> {
    const page = pagination?.page ?? 1
    const size = pagination?.size ?? 20
    const skip = (page - 1) * size
    return this.items
      .filter((item) => item.userId.toString() === userId)
      .slice(skip, skip + size)
  }

  async findByYearOfAcquisition(
    userId: string,
    yearOfAcquisition: number,
  ): Promise<Tre[] | null> {
    return this.items.filter(
      (item) =>
        item.userId.toString() === userId &&
        item.yearOfAcquisition === yearOfAcquisition,
    )
  }

  async findDuplicateTre(params: FindDuplicateTreParams): Promise<Tre | null> {
    return (
      this.items.find((item) => {
        return (
          item.userId.toString() === params.userId &&
          item.firstTreDay?.getTime() === params.firstTreDay.getTime() &&
          item.lastTreDay?.getTime() === params.lastTreDay.getTime() &&
          item.requestType === params.requestType &&
          item.yearOfAcquisition === params.yearOfAcquisition &&
          item.amoutOfTreDays === params.amoutOfTreDays &&
          (item.treSeiNumber ?? null) === (params.treSeiNumber ?? null)
        )
      }) ?? null
    )
  }

  async updateTre(tre: Tre): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.id.toString() === tre.id.toString(),
    )
    this.items[index] = tre
  }

  async deleteTre(treId: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toString() !== treId)
  }
}

function createTreWorkbookBuffer({
  userName,
  userEmail,
  includeUserSheet = true,
  requestDateValue = '01/02/2026',
  observations = '05/02/2026',
}: {
  userName: string
  userEmail: string | null
  includeUserSheet?: boolean
  requestDateValue?: string
  observations?: string | null
}): Buffer {
  const workbook = XLSX.utils.book_new()

  const mainSheet = XLSX.utils.aoa_to_sheet([['NOME'], [userName]])
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'LISTA SERVIDORES')

  if (includeUserSheet) {
    const userRows = [
      [],
      ['NOME DO SERVIDOR', userName],
      ['EMAIL', userEmail],
      [],
      [
        'DATA DA SOLICITAÇÃO',
        'N° DO SEI',
        'Nº DO DOCUMENTO (SEI)',
        'TIPO DE SOLICITAÇÃO',
        'ANO AQUISIÇÃO TRE',
        'QTDADE DE DIAS',
        'OBSERVAÇÕES',
        'GOZO EFETIVO',
      ],
      [
        requestDateValue,
        '0030200026.004757/2022-76',
        30212164,
        'INCLUIR SALDO',
        2022,
        4,
        observations,
        'SIM',
      ],
    ]

    const parts = userName
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    const sheetName = `${parts[0]} ${parts[parts.length - 1]}`.toUpperCase()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(userRows),
      sheetName,
    )
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

describe('Import TRE spreadsheet use case', () => {
  let usersRepository: InMemoryUsersRepository
  let treRepository: InMemoryTreRepository
  let sut: ImportTreSpreadsheetUseCase

  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    treRepository = new InMemoryTreRepository()

    const excelReader = new ExcelReaderService()
    const matcher = new TreUserSheetMatcherService(excelReader)
    const parser = new TreSheetParserService(excelReader)
    const userRegistration = new UserRegistrationService(
      usersRepository,
      new FakeHashGenerator(),
    )
    const treBalanceSyncService = new TreBalanceSyncService(
      treRepository,
      usersRepository,
    )
    const treRegistration = new TreRegistrationService(
      treRepository,
      treBalanceSyncService,
    )

    sut = new ImportTreSpreadsheetUseCase(
      excelReader,
      matcher,
      parser,
      userRegistration,
      treRegistration,
    )
  })

  it('should create user and TRE records from spreadsheet', async () => {
    const file = createTreWorkbookBuffer({
      userName: 'Adriano de Paula Santana',
      userEmail: 'adriano.santana4@arpe.pe.gov.br',
    })

    const result = await sut.execute({ file })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.usersCreated).toBe(1)
    expect(result.value.tresCreated).toBe(1)
    expect(result.value.tresAlreadyExisted).toBe(0)
    expect(result.value.tresWithErrors).toBe(0)
    expect(result.value.treErrors).toHaveLength(0)
  })

  it('should not create duplicated users or TRE records', async () => {
    const file = createTreWorkbookBuffer({
      userName: 'Adriano de Paula Santana',
      userEmail: 'adriano.santana4@arpe.pe.gov.br',
    })

    const firstImport = await sut.execute({ file })
    const secondImport = await sut.execute({ file })

    expect(firstImport.isRight()).toBe(true)
    expect(secondImport.isRight()).toBe(true)
    if (secondImport.isLeft()) return

    expect(usersRepository.items).toHaveLength(1)
    expect(treRepository.items).toHaveLength(1)
    expect(secondImport.value.usersCreated).toBe(0)
    expect(secondImport.value.usersAlreadyExisted).toBe(1)
    expect(secondImport.value.tresCreated).toBe(0)
    expect(secondImport.value.tresAlreadyExisted).toBe(1)
  })

  it('should return extraction error when email is missing', async () => {
    const file = createTreWorkbookBuffer({
      userName: 'Adriano de Paula Santana',
      userEmail: null,
    })

    const result = await sut.execute({ file })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.usersCreated).toBe(0)
    expect(result.value.usersWithErrors).toBe(1)
    expect(result.value.extractionErrors).toHaveLength(1)
    expect(result.value.extractionErrors[0].reason).toContain('Email')
  })

  it('should not create TRE when request date is invalid without observations date', async () => {
    const file = createTreWorkbookBuffer({
      userName: 'Adriano de Paula Santana',
      userEmail: 'adriano.santana4@arpe.pe.gov.br',
      requestDateValue: 'XXXXX',
      observations: null,
    })

    const firstImport = await sut.execute({ file })
    const secondImport = await sut.execute({ file })

    expect(firstImport.isRight()).toBe(true)
    expect(secondImport.isRight()).toBe(true)
    if (firstImport.isLeft() || secondImport.isLeft()) return

    expect(firstImport.value.tresCreated).toBe(0)
    expect(secondImport.value.tresCreated).toBe(0)
    expect(firstImport.value.tresWithErrors).toBe(1)
    expect(firstImport.value.treErrors[0].type).toBe('PARSE')
    expect(treRepository.items).toHaveLength(0)
  })
})
