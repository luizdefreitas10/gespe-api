import { Either, left, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { UserNotFoundError } from '@/domain/app/application/use-cases/errors/user-not-found-error'
import { User } from '../../enterprise/entities/user'
import { UserRepository } from '../repositories/user-repository'

interface FetchUserByIdUseCaseRequest {
  id: string
}

type FetchUserByIdUseCaseResponse = Either<
  UserNotFoundError,
  {
    user: User
  }
>

@Injectable()
export class FetchUserByIdUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({
    id,
  }: FetchUserByIdUseCaseRequest): Promise<FetchUserByIdUseCaseResponse> {
    const user = await this.userRepository.findById(id)

    if (!user) {
      return left(new UserNotFoundError())
    }

    return right({
      user,
    })
  }
}
