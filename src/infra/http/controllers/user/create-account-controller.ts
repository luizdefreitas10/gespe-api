import {
  ConflictException,
  Body,
  Controller,
  HttpCode,
  Post,
  Get,
  UsePipes,
  Query,
  BadRequestException,
} from '@nestjs/common'

import { z } from 'zod'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { RegisterUserUseCase } from '@/domain/app/application/use-cases/register-user'
import { UserAlreadyExistsError } from '@/domain/app/application/use-cases/errors/user-already-exists'
import { Public } from '@/infra/auth/public'

const UserRole = z.enum(['ADMIN', 'GESTOR', 'USER'])

const createrAccountBodySchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  password: z.string(),
  birthDate: z.coerce.date().optional(),
  registry: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  role: UserRole.optional(),
})

type CreateAccountBodySchema = z.infer<typeof createrAccountBodySchema>

@Controller('/accounts')
@Public()
export class CreateAccountController {
  constructor(private registerUserUseCase: RegisterUserUseCase) {}

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createrAccountBodySchema))
  async createAccount(@Body() body: CreateAccountBodySchema) {
    const {
      email,
      password,
      fullName,
      birthDate,
      department,
      position,
      registry,
      role,
    } = body

    const result = await this.registerUserUseCase.execute({
      email,
      password,
      fullName,
      birthDate,
      department,
      position,
      registry,
      role: role ?? 'USER',
    })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case UserAlreadyExistsError:
          throw new ConflictException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }
  }
}
