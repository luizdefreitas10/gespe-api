import { Either, left, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { Role, Status } from '@prisma/client'
import { UserRepository } from '../repositories/user-repository'
import { UserNotFoundError } from './errors/user-not-found-error'

interface UpdateUserUseCaseRequest {
  id: string
  fullName?: string
  email?: string
  birthDate?: Date
  registry?: string | null
  position?: string
  department?: string
  role?: Role
  status?: Status
}

type UpdateUserUseCaseResponse = Either<
  UserNotFoundError,
  {
    userId: string
  }
>

@Injectable()
export class UpdateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({
    id,
    fullName,
    email,
    birthDate,
    registry,
    position,
    department,
    role,
    status,
  }: UpdateUserUseCaseRequest): Promise<UpdateUserUseCaseResponse> {
    const user = await this.userRepository.findById(id)

    if (!user) {
      return left(new UserNotFoundError())
    }

    if (fullName !== undefined) {
      user.userName = fullName
    }

    if (email !== undefined) {
      user.email = email
    }

    if (birthDate !== undefined) {
      user.birthDate = birthDate
    }

    if (registry !== undefined) {
      user.registry = registry
    }

    if (position !== undefined) {
      user.position = position
    }

    if (department !== undefined) {
      user.department = department
    }

    if (role !== undefined) {
      user.role = role
    }

    if (status !== undefined) {
      user.status = status
    }

    await this.userRepository.updateUser(user)

    return right({
      userId: user.id.toString(),
    })
  }
}

