import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Patch,
} from '@nestjs/common'
import { Role, Status } from '@prisma/client'
import { z } from 'zod'
import { UpdateUserUseCase } from '@/domain/app/application/use-cases/update-user'
import { UserNotFoundError } from '@/domain/app/application/use-cases/errors/user-not-found-error'
import { Roles } from '@/infra/auth/roles.decorator'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'

const userRoleSchema = z.enum(['ADMIN', 'GESTOR', 'USER'])
const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])

const updateUserBodySchema = z
  .object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    birthDate: z.coerce.date().optional(),
    registry: z.string().optional().nullable(),
    position: z.string().optional(),
    department: z.string().optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update user',
  })

type UpdateUserBodySchema = z.infer<typeof updateUserBodySchema>

@Controller('/accounts/id/:id')
export class UpdateUserController {
  constructor(private updateUserUseCase: UpdateUserUseCase) {}

  @Patch()
  @HttpCode(204)
  @Roles([Role.ADMIN, Role.GESTOR])
  async updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserBodySchema))
    body: UpdateUserBodySchema,
  ) {
    const result = await this.updateUserUseCase.execute({
      id,
      fullName: body.fullName,
      email: body.email,
      birthDate: body.birthDate,
      registry: body.registry,
      position: body.position,
      department: body.department,
      role: body.role as Role | undefined,
      status: body.status as Status | undefined,
    })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case UserNotFoundError:
          throw new BadRequestException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }
  }
}

