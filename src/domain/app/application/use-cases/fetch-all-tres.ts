import { Either, left, right } from "@/core/either";
import { Injectable } from "@nestjs/common";
import { Tre } from "@/domain/app/enterprise/entities/tre";
import { TreRepository } from "@/domain/app/application/repositories/tre-repository";

interface FetchAllTresUseCaseRequest {
  page: number;
}

type FetchAllTresUseCaseResponse = Either<
  null,
  {
    tres: Tre[];
    count: number;
  }
>;

@Injectable()
export class FetchAllTresUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    page,
  }: FetchAllTresUseCaseRequest): Promise<FetchAllTresUseCaseResponse> {
    const tres = await this.treRepository.getAllTres({
      page,
    });

    if (!tres) {
      return left(null);
    }

    const count = tres.length;

    return right({
      count,
      tres,
    });
  }
}

