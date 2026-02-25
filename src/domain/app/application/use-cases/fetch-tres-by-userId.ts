import { Either, left, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { Tre } from '../../enterprise/entities/tre'
import { TreRepository } from '../repositories/tre-repository'

interface FetchTresByUserIdUseCaseRequest {
  page: number
  userId: string
}

type FetchTresByUserIdUseCaseResponse = Either<
  null,
  {
    tres: Tre[]
  }
>

@Injectable()
export class FetchTresByUserIdUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    page,
    userId,
  }: FetchTresByUserIdUseCaseRequest): Promise<FetchTresByUserIdUseCaseResponse> {
    const tres = await this.treRepository.findByUserId(userId, {
      page,
    })

    if (!tres) {
      return left(null)
    }

    return right({
      tres,
    })
  }
}
