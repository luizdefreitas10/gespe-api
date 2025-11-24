import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { VacationNotFoundError } from "./errors/vacation-not-found";
import { Vacation } from "../../enterprise/entities/vacation";
import { VacationRepository } from "../repositories/vacation-repository";

interface FetchVacationByIdUseCaseRequest {
  id: string;
}

type FetchVacationByIdUseCaseResponse = Either<
  VacationNotFoundError,
  {
    vacation: Vacation;
  }
>;

@Injectable()
export class FetchVacationByIdUseCase {
  constructor(private vacationRepository: VacationRepository) {}

  async execute({
    id,
  }: FetchVacationByIdUseCaseRequest): Promise<FetchVacationByIdUseCaseResponse> {
    const vacation = await this.vacationRepository.findById(id);

    if (!vacation) {
      return left(new VacationNotFoundError("id"));
    }

    return right({
      vacation,
    });
  }
}
