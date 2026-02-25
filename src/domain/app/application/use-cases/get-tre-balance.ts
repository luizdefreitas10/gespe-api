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
    let tres

    if (year) {
      tres = await this.treRepository.findByYearOfAcquisition(userId, year)
    } else {
      tres = await this.treRepository.findByUserId(userId, {
        page: 1,
        size: 1000,
      })
    }

    if (!tres || tres.length === 0) {
      return right({
        total: 0,
        used: 0,
        available: 0,
        year,
      })
    }

    const currentDate = new Date()
    // Normaliza a data atual para comparar apenas a data (sem hora)
    currentDate.setHours(0, 0, 0, 0)

    let total = 0
    let used = 0

    // Função auxiliar para calcular quantos dias foram utilizados baseado no range de datas
    const calculateUsedDays = (
      firstDay: Date | null | undefined,
      lastDay: Date | null | undefined,
      totalDays: number,
    ): number => {
      // Se não há datas definidas, não há dias utilizados
      if (!firstDay || !lastDay) {
        return 0
      }

      const firstTreDay = new Date(firstDay)
      firstTreDay.setHours(0, 0, 0, 0)
      const lastTreDay = new Date(lastDay)
      lastTreDay.setHours(0, 0, 0, 0)

      // Se a data atual ainda não chegou no primeiro dia, nenhum dia foi utilizado
      if (currentDate < firstTreDay) {
        return 0
      }

      // Se a data atual já passou do último dia, todos os dias foram utilizados
      if (currentDate > lastTreDay) {
        return totalDays
      }

      // Se a data atual está dentro do range, calcular quantos dias já passaram
      // Calcula a diferença em dias entre o primeiro dia e a data atual
      const diffTime = currentDate.getTime() - firstTreDay.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 para incluir o dia atual

      // Retorna o mínimo entre os dias calculados e o total de dias
      return Math.min(diffDays, totalDays)
    }

    for (const tre of tres) {
      // Filtra por ano se especificado
      if (year && tre.yearOfAcquisition !== year) {
        continue
      }

      const days = tre.amoutOfTreDays
      const requestType = tre.requestType

      switch (requestType) {
        case TreRequestType.INCLUIR_SALDO:
          // Incluir saldo adiciona dias ao saldo total de TRE
          total += days
          break

        case TreRequestType.SOLICITACAO_DE_GOZO:
          // Solicitação de gozo subtrai dias do saldo total
          // Se há datas definidas, calcula quantos dias foram utilizados
          if (tre.firstTreDay && tre.lastTreDay) {
            total -= days
            const usedDays = calculateUsedDays(
              tre.firstTreDay,
              tre.lastTreDay,
              days,
            )
            used += usedDays
          } else {
            // Se não há datas, apenas subtrai do total (não conta como utilizado ainda)
            total -= days
          }
          break

        case TreRequestType.CANCELAMENTO_DE_GOZO:
          // Cancelamento de gozo: se havia uma solicitação de gozo que foi cancelada,
          // os dias voltam ao saldo disponível
          // Não afeta os dias utilizados, pois o cancelamento significa que os dias não foram utilizados
          total += days
          break
      }
    }

    const available = Math.max(0, total - used)

    return right({
      total,
      used,
      available,
      year,
    })
  }
}
