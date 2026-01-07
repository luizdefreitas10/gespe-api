import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { TreNotFoundError } from "./errors/tre-not-found";
import { Tre } from "../../enterprise/entities/tre";
import { TreRepository } from "../repositories/tre-repository";

interface FetchTreByIdUseCaseRequest {
  id: string;
}

type FetchTreByIdUseCaseResponse = Either<
  TreNotFoundError,
  {
    tre: Tre;
  }
>;

@Injectable()
export class FetchTreByIdUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    id,
  }: FetchTreByIdUseCaseRequest): Promise<FetchTreByIdUseCaseResponse> {
    const tre = await this.treRepository.findById(id);

    if (!tre) {
      return left(new TreNotFoundError("id"));
    }

    return right({
      tre,
    });
  }
}

