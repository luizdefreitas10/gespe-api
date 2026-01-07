import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { TreNotFoundError } from "./errors/tre-not-found";
import { TreRepository } from "../repositories/tre-repository";
import { TreRequestType } from "@prisma/client";
import { Tre } from "../../enterprise/entities/tre";

interface UpdateTreUseCaseRequest {
  id: string;
  firstTreDay?: Date | null;
  lastTreDay?: Date | null;
  treSeiNumber?: string | null;
  requestType?: TreRequestType;
  yearOfAcquisition?: number;
  amoutOfTreDays?: number;
  observations?: string | null;
}

type UpdateTreUseCaseResponse = Either<
  TreNotFoundError,
  {
    tre: Tre;
  }
>;

@Injectable()
export class UpdateTreUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    id,
    firstTreDay,
    lastTreDay,
    treSeiNumber,
    requestType,
    yearOfAcquisition,
    amoutOfTreDays,
    observations,
  }: UpdateTreUseCaseRequest): Promise<UpdateTreUseCaseResponse> {
    const tre = await this.treRepository.findById(id);

    if (!tre) {
      return left(new TreNotFoundError("id"));
    }

    // Atualiza apenas os campos fornecidos
    if (firstTreDay !== undefined) {
      tre.firstTreDay = firstTreDay;
    }
    if (lastTreDay !== undefined) {
      tre.lastTreDay = lastTreDay;
    }
    if (treSeiNumber !== undefined) {
      tre.treSeiNumber = treSeiNumber;
    }
    if (requestType !== undefined) {
      tre.requestType = requestType;
    }
    if (yearOfAcquisition !== undefined) {
      tre.yearOfAcquisition = yearOfAcquisition;
    }
    if (amoutOfTreDays !== undefined) {
      tre.amoutOfTreDays = amoutOfTreDays;
    }
    if (observations !== undefined) {
      tre.observations = observations;
    }

    tre.updatedAt = new Date();

    await this.treRepository.updateTre(tre);

    return right({
      tre,
    });
  }
}

