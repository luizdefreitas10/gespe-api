import { Injectable } from '@nestjs/common'
import { TreRepository } from '@/domain/app/application/repositories/tre-repository'
import { UserRepository } from '@/domain/app/application/repositories/user-repository'
import { TreRequestType } from '@prisma/client'

@Injectable()
export class TreBalanceSyncService {
  constructor(
    private treRepository: TreRepository,
    private usersRepository: UserRepository,
  ) {}

  async syncUserTotalTreDays(userId: string): Promise<void> {
    const tres = await this.treRepository.findByUserId(userId, {
      page: 1,
      size: 5000,
    })

    if (!tres || tres.length === 0) {
      await this.usersRepository.updateTotalTreDays(userId, 0)
      return
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

    const available = Math.max(
      0,
      totalIncluded - totalRequestedGozo + totalCanceledGozo,
    )

    await this.usersRepository.updateTotalTreDays(userId, available)
  }
}
