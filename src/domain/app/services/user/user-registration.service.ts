import { Injectable } from '@nestjs/common'
import { UserRepository } from '@/domain/app/application/repositories/user-repository'
import { HashGenerator } from '@/domain/app/application/cryptography/hash-generator'
import { User } from '@/domain/app/enterprise/entities/user'
import { Either, left, right } from '@/core/either'

export interface RegisterUserRequest {
  fullName: string
  email: string
  password: string
}

export interface RegisterUserResult {
  user: User
  wasCreated: boolean
}

type RegisterUserResponse = Either<Error, RegisterUserResult>

@Injectable()
export class UserRegistrationService {
  constructor(
    private userRepository: UserRepository,
    private hashGenerator: HashGenerator,
  ) {}

  async registerIfNotExists(
    data: RegisterUserRequest,
  ): Promise<RegisterUserResponse> {
    const existingUser = await this.userRepository.findByEmail(data.email)

    if (existingUser) {
      return right({ user: existingUser, wasCreated: false })
    }

    const passwordHash = await this.hashGenerator.hash(data.password)

    const user = User.create({
      fullName: data.fullName,
      email: data.email,
      password: passwordHash,
      birthDate: new Date('1990-01-01'),
      department: 'Não informado',
      position: 'Servidor',
      role: 'USER',
    })

    await this.userRepository.createUser(user)

    return right({ user, wasCreated: true })
  }
}
