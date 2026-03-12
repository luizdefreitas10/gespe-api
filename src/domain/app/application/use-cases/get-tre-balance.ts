import { Either, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { TreRepository } from '../repositories/tre-repository'
import { TreRequestType } from '@prisma/client'

interface GetTreBalanceUseCaseRequest {
  userId: string
  year?: number
}

type GetTreBalanceUseCaseResponse = Either<
  null,
  {
    total: number
    used: number
    available: number
    recordsCount: number
    overallBalance: {
      total: number
      used: number
      available: number
      recordsCount: number
    }
    year?: number
  }
>

@Injectable()
export class GetTreBalanceUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    userId,
    year,
  }: GetTreBalanceUseCaseRequest): Promise<GetTreBalanceUseCaseResponse> {
    const tres =
      (await this.treRepository.findByUserId(userId, {
        page: 1,
        size: 5000,
      })) ?? []

    const overallBalance = this.calculateBalance(tres)

    if (!year) {
      return right({
        total: overallBalance.total,
        used: overallBalance.used,
        available: overallBalance.available,
        recordsCount: overallBalance.recordsCount,
        overallBalance,
      })
    }

    const tresFromYear = tres.filter((tre) => tre.yearOfAcquisition === year)
    const yearBalance = this.calculateBalance(tresFromYear)

    return right({
      total: yearBalance.total,
      used: yearBalance.used,
      available: yearBalance.available,
      recordsCount: yearBalance.recordsCount,
      overallBalance,
      year,
    })
  }

  private calculateBalance(
    tres: Array<{
      amoutOfTreDays: number
      requestType: TreRequestType
    }>,
  ) {
    if (tres.length === 0) {
      return {
        total: 0,
        used: 0,
        available: 0,
        recordsCount: 0,
      }
    }

    let totalIncluded = 0
    let totalRequestedGozo = 0
    let totalCanceledGozo = 0

    for (const tre of tres) {
      const days = Math.abs(tre.amoutOfTreDays)

      switch (tre.requestType) {
        case TreRequestType.INCLUIR_SALDO:
          totalIncluded += days
          break
        case TreRequestType.SOLICITACAO_DE_GOZO:
          totalRequestedGozo += days
          break
        case TreRequestType.CANCELAMENTO_DE_GOZO:
          totalCanceledGozo += days
          break
      }
    }

    return {
      total: totalIncluded,
      used: Math.max(0, totalRequestedGozo - totalCanceledGozo),
      available: Math.max(
        0,
        totalIncluded - totalRequestedGozo + totalCanceledGozo,
      ),
      recordsCount: tres.length,
    }
  }
}
