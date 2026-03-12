import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PaginationParams } from '@/core/repositories/pagination-params'
import { Vacation } from '../../enterprise/entities/vacation'
import {
  FindDuplicateVacationParams,
  VacationRepository,
} from '../repositories/vacation-repository'
import { GetVacationBalanceUseCase } from './get-vacation-balance'

class InMemoryVacationRepository extends VacationRepository {
  public items: Vacation[] = []

  async createVacation(vacation: Vacation): Promise<void> {
    this.items.push(vacation)
  }

  async findById(vacationId: string): Promise<Vacation | null> {
    return this.items.find((item) => item.id.toString() === vacationId) ?? null
  }

  async getAllVacations(params: PaginationParams): Promise<Vacation[] | null> {
    const take = params.size ?? 20
    const skip = (params.page - 1) * take
    return this.items.slice(skip, skip + take)
  }

  async findByUserId(
    userId: string,
    params: PaginationParams,
  ): Promise<Vacation[] | null> {
    const take = params.size ?? 20
    const skip = (params.page - 1) * take

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
    _params: FindDuplicateVacationParams,
  ): Promise<Vacation | null> {
    const found = this.items.find((item) => {
      return (
        item.userId.toString() === _params.userId &&
        item.firstVacationDay.getTime() ===
          _params.firstVacationDay.getTime() &&
        item.lastVacationDay.getTime() === _params.lastVacationDay.getTime() &&
        item.requestType === _params.requestType &&
        item.year === _params.year &&
        item.amoutOfVacationDays === _params.amoutOfVacationDays &&
        (item.vacationSeiNumber ?? null) === (_params.vacationSeiNumber ?? null)
      )
    })

    return found ?? null
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

function makeVacation({
  userId,
  requestType,
  year,
  amountDays,
  firstVacationDay,
  lastVacationDay,
}: {
  userId: string
  requestType:
    | 'ALTERACAO_DE_GOZO'
    | 'PROGRAMACAO_DE_FERIAS'
    | 'SOLICITACAO_DE_GOZO'
    | 'SUSPENSAO_DE_GOZO'
  year: number
  amountDays: number
  firstVacationDay: Date
  lastVacationDay: Date
}) {
  return Vacation.create({
    userId: new UniqueEntityID(userId),
    requestType,
    year,
    amoutOfVacationDays: amountDays,
    firstVacationDay,
    lastVacationDay,
    effectiveEnjoyment: 'NO',
  })
}

describe('Get vacation balance', () => {
  let vacationRepository: InMemoryVacationRepository
  let sut: GetVacationBalanceUseCase

  beforeEach(() => {
    vacationRepository = new InMemoryVacationRepository()
    sut = new GetVacationBalanceUseCase(vacationRepository)
  })

  it('should return year balance and overall balance together', async () => {
    const userId = 'user-1'

    await vacationRepository.createVacation(
      makeVacation({
        userId,
        requestType: 'PROGRAMACAO_DE_FERIAS',
        year: 2025,
        amountDays: 30,
        firstVacationDay: new Date('2000-01-01'),
        lastVacationDay: new Date('2000-01-30'),
      }),
    )

    await vacationRepository.createVacation(
      makeVacation({
        userId,
        requestType: 'SUSPENSAO_DE_GOZO',
        year: 2025,
        amountDays: 5,
        firstVacationDay: new Date('2000-02-01'),
        lastVacationDay: new Date('2000-02-05'),
      }),
    )

    await vacationRepository.createVacation(
      makeVacation({
        userId,
        requestType: 'PROGRAMACAO_DE_FERIAS',
        year: 2026,
        amountDays: 20,
        firstVacationDay: new Date('2000-03-01'),
        lastVacationDay: new Date('2000-03-20'),
      }),
    )

    const result = await sut.execute({ userId, year: 2025 })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.total).toBe(25)
    expect(result.value.used).toBe(30)
    expect(result.value.available).toBe(0)
    expect(result.value.recordsCount).toBe(2)
    expect(result.value.overallBalance).toEqual({
      total: 45,
      used: 50,
      available: 0,
      recordsCount: 3,
    })
  })

  it('should return overall values when year is not informed', async () => {
    const userId = 'user-1'

    await vacationRepository.createVacation(
      makeVacation({
        userId,
        requestType: 'PROGRAMACAO_DE_FERIAS',
        year: 2026,
        amountDays: 10,
        firstVacationDay: new Date('2000-01-01'),
        lastVacationDay: new Date('2000-01-10'),
      }),
    )

    const result = await sut.execute({ userId })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return

    expect(result.value.total).toBe(10)
    expect(result.value.used).toBe(10)
    expect(result.value.available).toBe(0)
    expect(result.value.recordsCount).toBe(1)
    expect(result.value.overallBalance).toEqual({
      total: 10,
      used: 10,
      available: 0,
      recordsCount: 1,
    })
  })
})
