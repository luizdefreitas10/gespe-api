import { GetTreBalanceUseCase } from './get-tre-balance'
import {
  TreRepository,
  FindDuplicateTreParams,
} from '../repositories/tre-repository'
import { Tre } from '../../enterprise/entities/tre'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PaginationParams } from '@/core/repositories/pagination-params'

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
    _pagination?: PaginationParams,
  ): Promise<Tre[] | null> {
    const page = _pagination?.page ?? 1
    const size = _pagination?.size ?? 20
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
    const match = this.items.find((item) => {
      return (
        item.userId.toString() === _params.userId &&
        item.requestType === _params.requestType &&
        item.yearOfAcquisition === _params.yearOfAcquisition &&
        item.amoutOfTreDays === _params.amoutOfTreDays &&
        (item.treSeiNumber ?? null) === (_params.treSeiNumber ?? null) &&
        item.firstTreDay?.getTime() === _params.firstTreDay.getTime() &&
        item.lastTreDay?.getTime() === _params.lastTreDay.getTime()
      )
    })

    return match ?? null
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
  amoutOfTreDays,
}: {
  userId: string
  requestType: 'INCLUIR_SALDO' | 'SOLICITACAO_DE_GOZO' | 'CANCELAMENTO_DE_GOZO'
  yearOfAcquisition: number
  amoutOfTreDays: number
}) {
  return Tre.create({
    userId: new UniqueEntityID(userId),
    requestType,
    yearOfAcquisition,
    amoutOfTreDays,
    firstTreDay: new Date('2026-01-01'),
    lastTreDay: new Date('2026-01-01'),
  })
}

describe('Get TRE balance', () => {
  let treRepository: InMemoryTreRepository
  let sut: GetTreBalanceUseCase

  beforeEach(() => {
    treRepository = new InMemoryTreRepository()
    sut = new GetTreBalanceUseCase(treRepository)
  })

  it('should calculate balance by request type rules with records', async () => {
    const userId = 'user-1'

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'INCLUIR_SALDO',
        yearOfAcquisition: 2026,
        amoutOfTreDays: 10,
      }),
    )

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'SOLICITACAO_DE_GOZO',
        yearOfAcquisition: 2026,
        amoutOfTreDays: -4,
      }),
    )

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'CANCELAMENTO_DE_GOZO',
        yearOfAcquisition: 2026,
        amoutOfTreDays: 2,
      }),
    )

    const result = await sut.execute({ userId })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.total).toBe(10)
    expect(result.value.used).toBe(2)
    expect(result.value.available).toBe(8)
    expect(result.value.recordsCount).toBe(3)
    expect(result.value.overallBalance).toEqual({
      total: 10,
      used: 2,
      available: 8,
      recordsCount: 3,
    })
  })

  it('should filter by acquisition year and keep overall totals', async () => {
    const userId = 'user-1'

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'INCLUIR_SALDO',
        yearOfAcquisition: 2025,
        amoutOfTreDays: 5,
      }),
    )

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'INCLUIR_SALDO',
        yearOfAcquisition: 2026,
        amoutOfTreDays: 10,
      }),
    )

    await treRepository.createTre(
      makeTre({
        userId,
        requestType: 'SOLICITACAO_DE_GOZO',
        yearOfAcquisition: 2026,
        amoutOfTreDays: 3,
      }),
    )

    const result = await sut.execute({ userId, year: 2026 })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.total).toBe(10)
    expect(result.value.used).toBe(3)
    expect(result.value.available).toBe(7)
    expect(result.value.recordsCount).toBe(2)
    expect(result.value.overallBalance).toEqual({
      total: 15,
      used: 3,
      available: 12,
      recordsCount: 3,
    })
  })
})
