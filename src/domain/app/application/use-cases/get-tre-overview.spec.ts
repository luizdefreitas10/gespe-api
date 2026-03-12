import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PaginationParams } from '@/core/repositories/pagination-params'
import { Tre } from '../../enterprise/entities/tre'
import { GetTreOverviewUseCase } from './get-tre-overview'
import {
  FindDuplicateTreParams,
  TreRepository,
} from '../repositories/tre-repository'

class InMemoryTreRepository extends TreRepository {
  public items: Tre[] = []

  async createTre(tre: Tre): Promise<void> {
    this.items.push(tre)
  }

  async findById(treId: string): Promise<Tre | null> {
    return this.items.find((item) => item.id.toString() === treId) ?? null
  }

  async getAllTres(params: PaginationParams): Promise<Tre[] | null> {
    const take = params.size ?? 20
    const skip = (params.page - 1) * take
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

  async findDuplicateTre(_params: FindDuplicateTreParams): Promise<Tre | null> {
    const found = this.items.find((item) => {
      return (
        item.userId.toString() === _params.userId &&
        item.requestType === _params.requestType &&
        item.yearOfAcquisition === _params.yearOfAcquisition &&
        item.amoutOfTreDays === _params.amoutOfTreDays &&
        (item.treSeiNumber ?? null) === (_params.treSeiNumber ?? null) &&
        (item.firstTreDay?.getTime() ?? null) ===
          (_params.firstTreDay?.getTime() ?? null) &&
        (item.lastTreDay?.getTime() ?? null) ===
          (_params.lastTreDay?.getTime() ?? null)
      )
    })

    return found ?? null
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

function makeTre({
  userId,
  requestType,
  yearOfAcquisition,
  amountDays,
}: {
  userId: string
  requestType: 'INCLUIR_SALDO' | 'SOLICITACAO_DE_GOZO' | 'CANCELAMENTO_DE_GOZO'
  yearOfAcquisition: number
  amountDays: number
}) {
  return Tre.create({
    userId: new UniqueEntityID(userId),
    requestType,
    yearOfAcquisition,
    amoutOfTreDays: amountDays,
    firstTreDay: new Date('2026-01-01'),
    lastTreDay: new Date('2026-01-01'),
    effectiveEnjoyment: 'NO',
  })
}

describe('Get TRE overview', () => {
  let treRepository: InMemoryTreRepository
  let sut: GetTreOverviewUseCase

  beforeEach(() => {
    treRepository = new InMemoryTreRepository()
    sut = new GetTreOverviewUseCase(treRepository)
  })

  it('should return total and yearly balances with records counts', async () => {
    const userId = 'user-1'

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'INCLUIR_SALDO',
        yearOfAcquisition: 2025,
        amountDays: 10,
      }),
    )
    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'SOLICITACAO_DE_GOZO',
        yearOfAcquisition: 2025,
        amountDays: 4,
      }),
    )
    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'INCLUIR_SALDO',
        yearOfAcquisition: 2026,
        amountDays: 8,
      }),
    )

    const result = await sut.execute({ userId })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.totalRecordsCount).toBe(3)
    expect(result.value.filteredRecordsCount).toBe(3)
    expect(result.value.totalBalance).toEqual({
      total: 18,
      used: 4,
      available: 14,
    })
    expect(result.value.yearBalances).toEqual([
      {
        year: 2026,
        total: 8,
        used: 0,
        available: 8,
        recordsCount: 1,
      },
      {
        year: 2025,
        total: 10,
        used: 4,
        available: 6,
        recordsCount: 2,
      },
    ])
  })

  it('should filter records by selected year and keep total aggregates', async () => {
    const userId = 'user-1'

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'INCLUIR_SALDO',
        yearOfAcquisition: 2025,
        amountDays: 10,
      }),
    )
    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'INCLUIR_SALDO',
        yearOfAcquisition: 2026,
        amountDays: 6,
      }),
    )

    const result = await sut.execute({ userId, year: 2026 })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.selectedYear).toBe(2026)
    expect(result.value.totalRecordsCount).toBe(2)
    expect(result.value.filteredRecordsCount).toBe(1)
    expect(result.value.tres).toHaveLength(1)
    expect(result.value.tres[0].yearOfAcquisition).toBe(2026)
    expect(result.value.totalBalance.available).toBe(16)
  })
})
