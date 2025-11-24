import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { VacationNotFoundError } from "./errors/vacation-not-found";
import { Vacation } from "../../enterprise/entities/vacation";
import { VacationRepository } from "../repositories/vacation-repository";

interface FetchVacationByYearAndUserIdUseCaseRequest {
  year: number;
  userId: string;
}

type FetchVacationByYearAndUserIdUseCaseResponse = Either<
  VacationNotFoundError,
  {
    vacations: Vacation[];
  }
>;

@Injectable()
export class FetchVacationByYearAndUserIdUseCase {
  constructor(private vacationRepository: VacationRepository) {}

  async execute({
    year,
    userId,
  }: FetchVacationByYearAndUserIdUseCaseRequest): Promise<FetchVacationByYearAndUserIdUseCaseResponse> {
    const vacations = await this.vacationRepository.findByYear(userId, year);

    if (!vacations) {
      return left(new VacationNotFoundError("id"));
    }

    return right({
      vacations,
    });
  }
}
