import { Either, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { UserAlreadyExistsError } from './errors/user-already-exists'
import { User } from '../../enterprise/entities/user'
import { UserRepository } from '../repositories/user-repository'

interface FetchUsersUseCaseRequest {
  page: number
}

type FetchUsersUseCaseResponse = Either<
  null,
  {
    users: User[]
  }
>

@Injectable()
export class FetchUsersUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({
    page,
  }: FetchUsersUseCaseRequest): Promise<FetchUsersUseCaseResponse> {
    const users = await this.userRepository.getAllUsers({ page })

    return right({
      users,
    })
  }
}
