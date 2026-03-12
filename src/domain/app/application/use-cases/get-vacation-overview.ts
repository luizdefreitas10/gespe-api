import { Either, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { VacationRepository } from '../repositories/vacation-repository'
import { Vacation } from '../../enterprise/entities/vacation'
import { VacationRequestType } from '@prisma/client'

export interface VacationBalanceSummary {
  total: number
  used: number
  available: number
}

export interface VacationYearBalanceSummary extends VacationBalanceSummary {
  year: number
}

interface GetVacationOverviewUseCaseRequest {
  userId: string
}

type GetVacationOverviewUseCaseResponse = Either<
  null,
  {
    vacations: Vacation[]
    totalBalance: VacationBalanceSummary
    yearBalances: VacationYearBalanceSummary[]
  }
>

@Injectable()
export class GetVacationOverviewUseCase {
  constructor(private vacationRepository: VacationRepository) {}

  async execute({
    userId,
  }: GetVacationOverviewUseCaseRequest): Promise<GetVacationOverviewUseCaseResponse> {
    const vacations =
      (await this.vacationRepository.findByUserId(userId, {
        page: 1,
        size: 5000,
      })) ?? []

    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    const yearMap = new Map<number, { total: number; used: number }>()

    let total = 0
    let used = 0

    for (const vacation of vacations) {
      const yearBucket = yearMap.get(vacation.year) ?? { total: 0, used: 0 }
      const days = vacation.amoutOfVacationDays

      switch (vacation.requestType) {
        case VacationRequestType.PROGRAMACAO_DE_FERIAS: {
          const usedDays = this.calculateUsedDays(
            vacation.firstVacationDay,
            vacation.lastVacationDay,
            days,
            currentDate,
          )

          total += days
          used += usedDays

          yearBucket.total += days
          yearBucket.used += usedDays
          break
        }
        case VacationRequestType.SUSPENSAO_DE_GOZO:
          total -= days
          yearBucket.total -= days
          break
        case VacationRequestType.ALTERACAO_DE_GOZO:
        case VacationRequestType.SOLICITACAO_DE_GOZO:
          break
      }

      yearMap.set(vacation.year, yearBucket)
    }

    const yearBalances: VacationYearBalanceSummary[] = Array.from(
      yearMap.entries(),
    )
      .map(([year, values]) => ({
        year,
        total: values.total,
        used: values.used,
        available: Math.max(0, values.total - values.used),
      }))
      .sort((a, b) => b.year - a.year)

    return right({
      vacations: [...vacations].sort(
        (a, b) =>
          b.firstVacationDay.getTime() - a.firstVacationDay.getTime() ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      ),
      totalBalance: {
        total,
        used,
        available: Math.max(0, total - used),
      },
      yearBalances,
    })
  }

  private calculateUsedDays(
    firstDay: Date,
    lastDay: Date,
    totalDays: number,
    currentDate: Date,
  ): number {
    const firstVacationDay = new Date(firstDay)
    firstVacationDay.setHours(0, 0, 0, 0)

    const lastVacationDay = new Date(lastDay)
    lastVacationDay.setHours(0, 0, 0, 0)

    if (currentDate < firstVacationDay) {
      return 0
    }

    if (currentDate > lastVacationDay) {
      return totalDays
    }

    const diffTime = currentDate.getTime() - firstVacationDay.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.min(diffDays, totalDays)
  }
}
