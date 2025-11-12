import { Either, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { VacationRequestType } from "@prisma/client";
import { VacationAlreadyExistsError } from "./errors/vacation-already-exists";
import { Vacation } from "../../enterprise/entities/vacation";
import { VacationRepository } from "../repositories/vacation-repository";
import { UniqueEntityID } from "@/core/entities/unique-entity-id";

interface RegisterVacationUseCaseRequest {
  userId: UniqueEntityID;
  firstVacationDay: Date;
  lastVacationDay: Date;
  vacationSeiNumber?: string | null;
  requestType: VacationRequestType;
  year: number;
  amoutOfVacationDays: number;
  observations?: string | null;
}

type RegisterVacationUseCaseResponse = Either<
  VacationAlreadyExistsError,
  {
    vacation: Vacation;
  }
>;

@Injectable()
export class RegisterVacationUseCase {
  constructor(private vacationRepository: VacationRepository) {}

  async execute({
    userId,
    firstVacationDay,
    lastVacationDay,
    vacationSeiNumber,
    requestType,
    year,
    amoutOfVacationDays,
    observations,
  }: RegisterVacationUseCaseRequest): Promise<RegisterVacationUseCaseResponse> {
    const vacation = Vacation.create({
      userId,
      firstVacationDay,
      lastVacationDay,
      vacationSeiNumber,
      requestType,
      year,
      amoutOfVacationDays,
      observations,
    });

    await this.vacationRepository.createVacation(vacation);

    return right({
      vacation,
    });
  }
}
