import { Either, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { VacationRepository } from "../repositories/vacation-repository";
import { VacationRequestType } from "@prisma/client";

interface GetVacationBalanceUseCaseRequest {
  userId: string;
  year?: number;
}

type GetVacationBalanceUseCaseResponse = Either<
  null,
  {
    total: number;
    used: number;
    available: number;
    year?: number;
  }
>;

@Injectable()
export class GetVacationBalanceUseCase {
  constructor(private vacationRepository: VacationRepository) {}

  async execute({
    userId,
    year,
  }: GetVacationBalanceUseCaseRequest): Promise<GetVacationBalanceUseCaseResponse> {
    let vacations;

    if (year) {
      vacations = await this.vacationRepository.findByYear(userId, year);
    } else {
      vacations = await this.vacationRepository.findByUserId(userId, {
        page: 1,
        size: 1000,
      });
    }

    if (!vacations || vacations.length === 0) {
      return right({
        total: 0,
        used: 0,
        available: 0,
        year,
      });
    }

    const currentDate = new Date();
    // Normaliza a data atual para comparar apenas a data (sem hora)
    currentDate.setHours(0, 0, 0, 0);

    let total = 0;
    let used = 0;

    // Função auxiliar para calcular quantos dias foram utilizados baseado no range de datas
    const calculateUsedDays = (
      firstDay: Date,
      lastDay: Date,
      totalDays: number
    ): number => {
      const firstVacationDay = new Date(firstDay);
      firstVacationDay.setHours(0, 0, 0, 0);
      const lastVacationDay = new Date(lastDay);
      lastVacationDay.setHours(0, 0, 0, 0);

      // Se a data atual ainda não chegou no primeiro dia, nenhum dia foi utilizado
      if (currentDate < firstVacationDay) {
        return 0;
      }

      // Se a data atual já passou do último dia, todos os dias foram utilizados
      if (currentDate > lastVacationDay) {
        return totalDays;
      }

      // Se a data atual está dentro do range, calcular quantos dias já passaram
      // Calcula a diferença em dias entre o primeiro dia e a data atual
      const diffTime = currentDate.getTime() - firstVacationDay.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia atual

      // Retorna o mínimo entre os dias calculados e o total de dias
      return Math.min(diffDays, totalDays);
    };

    for (const vacation of vacations) {
      // Filtra por ano se especificado
      if (year && vacation.year !== year) {
        continue;
      }

      const days = vacation.amoutOfVacationDays;
      const requestType = vacation.requestType;

      switch (requestType) {
        case VacationRequestType.PROGRAMACAO_DE_FERIAS:
          // Programação de férias adiciona dias ao saldo disponível
          total += days;

          // Calcula quantos dias foram utilizados baseado no range de datas
          const usedDays = calculateUsedDays(
            vacation.firstVacationDay,
            vacation.lastVacationDay,
            days
          );
          used += usedDays;
          break;

        case VacationRequestType.ALTERACAO_DE_GOZO:
          // Alteração de gozo apenas muda a data, não altera o saldo
          // Não faz nada no cálculo do saldo
          break;

        case VacationRequestType.SOLICITACAO_DE_GOZO:
          // Solicitação de gozo não altera o saldo diretamente
          // O saldo só é alterado quando há programação ou suspensão
          break;

        case VacationRequestType.SUSPENSAO_DE_GOZO:
          // Suspensão de gozo reduz o saldo total
          // amoutOfVacationDays indica quantos dias foram suspensos e devem ser reduzidos
          // Não afeta os dias utilizados diretamente, pois a suspensão significa
          // que os dias não foram utilizados
          total -= days;
          break;
      }
    }

    const available = Math.max(0, total - used);

    return right({
      total,
      used,
      available,
      year,
    });
  }
}

