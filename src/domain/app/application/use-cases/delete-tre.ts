import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { TreNotFoundError } from "./errors/tre-not-found";
import { TreRepository } from "../repositories/tre-repository";

interface DeleteTreUseCaseRequest {
  id: string;
}

type DeleteTreUseCaseResponse = Either<
  TreNotFoundError,
  null
>;

@Injectable()
export class DeleteTreUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    id,
  }: DeleteTreUseCaseRequest): Promise<DeleteTreUseCaseResponse> {
    const tre = await this.treRepository.findById(id);

    if (!tre) {
      return left(new TreNotFoundError("id"));
    }

    await this.treRepository.deleteTre(id);

    return right(null);
  }
}

