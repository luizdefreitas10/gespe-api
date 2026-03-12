import { Either, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { TreRepository } from '../repositories/tre-repository'
import { Tre } from '../../enterprise/entities/tre'
import { TreRequestType } from '@prisma/client'

export interface TreBalanceSummary {
  total: number
  used: number
  available: number
}

export interface TreYearOverview extends TreBalanceSummary {
  year: number
  recordsCount: number
}

interface GetTreOverviewUseCaseRequest {
  userId: string
  year?: number
}

type GetTreOverviewUseCaseResponse = Either<
  null,
  {
    totalRecordsCount: number
    filteredRecordsCount: number
    selectedYear: number | null
    totalBalance: TreBalanceSummary
    yearBalances: TreYearOverview[]
    tres: Tre[]
  }
>

@Injectable()
export class GetTreOverviewUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    userId,
    year,
  }: GetTreOverviewUseCaseRequest): Promise<GetTreOverviewUseCaseResponse> {
    const allTres =
      (await this.treRepository.findByUserId(userId, {
        page: 1,
        size: 5000,
      })) ?? []

    const yearMap = new Map<
      number,
      {
        totalIncluded: number
        totalRequestedGozo: number
        totalCanceledGozo: number
        recordsCount: number
      }
    >()

    let totalIncluded = 0
    let totalRequestedGozo = 0
    let totalCanceledGozo = 0

    for (const tre of allTres) {
      const yearBucket = yearMap.get(tre.yearOfAcquisition) ?? {
        totalIncluded: 0,
        totalRequestedGozo: 0,
        totalCanceledGozo: 0,
        recordsCount: 0,
      }

      const days = Math.abs(tre.amoutOfTreDays)
      yearBucket.recordsCount += 1

      switch (tre.requestType) {
        case TreRequestType.INCLUIR_SALDO:
          totalIncluded += days
          yearBucket.totalIncluded += days
          break
        case TreRequestType.SOLICITACAO_DE_GOZO:
          totalRequestedGozo += days
          yearBucket.totalRequestedGozo += days
          break
        case TreRequestType.CANCELAMENTO_DE_GOZO:
          totalCanceledGozo += days
          yearBucket.totalCanceledGozo += days
          break
      }

      yearMap.set(tre.yearOfAcquisition, yearBucket)
    }

    const yearBalances: TreYearOverview[] = Array.from(yearMap.entries())
      .map(([acquisitionYear, values]) => {
        const used = Math.max(
          0,
          values.totalRequestedGozo - values.totalCanceledGozo,
        )
        const available = Math.max(
          0,
          values.totalIncluded - values.totalRequestedGozo + values.totalCanceledGozo,
        )

        return {
          year: acquisitionYear,
          total: values.totalIncluded,
          used,
          available,
          recordsCount: values.recordsCount,
        }
      })
      .sort((a, b) => b.year - a.year)

    const filteredTres = year
      ? allTres.filter((tre) => tre.yearOfAcquisition === year)
      : allTres

    return right({
      totalRecordsCount: allTres.length,
      filteredRecordsCount: filteredTres.length,
      selectedYear: year ?? null,
      totalBalance: {
        total: totalIncluded,
        used: Math.max(0, totalRequestedGozo - totalCanceledGozo),
        available: Math.max(
          0,
          totalIncluded - totalRequestedGozo + totalCanceledGozo,
        ),
      },
      yearBalances,
      tres: [...filteredTres].sort(
        (a, b) =>
          (b.firstTreDay?.getTime() ?? 0) - (a.firstTreDay?.getTime() ?? 0) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    })
  }
}
