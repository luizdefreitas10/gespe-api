import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { Vacation } from "../../enterprise/entities/vacation";
import { VacationRepository } from "../repositories/vacation-repository";

interface FetchVacationsByUserIdUseCaseRequest {
  page: number;
  userId: string;
}

type FetcVacationsByUserIdUseCaseResponse = Either<
  null,
  {
    vacations: Vacation[];
  }
>;

@Injectable()
export class FetchVacationsByUserIdUseCase {
  constructor(private vacationRepository: VacationRepository) {}

  async execute({
    page,
    userId,
  }: FetchVacationsByUserIdUseCaseRequest): Promise<FetcVacationsByUserIdUseCaseResponse> {
    const vacations = await this.vacationRepository.findByUserId(userId, {
      page,
    });

    if (!vacations) {
      return left(null);
    }

    return right({
      vacations,
    });
  }
}
