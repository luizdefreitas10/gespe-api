import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common'

import { z } from 'zod'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { RegisterTreUseCase } from '@/domain/app/application/use-cases/register-tre'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { TokenBodySchema } from '@/infra/auth/jwt.strategy'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'

const treRequestTypeEnum = z.enum([
  'INCLUIR_SALDO',
  'SOLICITACAO_DE_GOZO',
  'CANCELAMENTO_DE_GOZO',
])

const createTreBodySchema = z.object({
  userId: z.string().uuid().optional(),
  firstTreDay: z.coerce.date().optional().nullable(),
  lastTreDay: z.coerce.date().optional().nullable(),
  treSeiNumber: z.string().optional().nullable(),
  requestType: treRequestTypeEnum,
  yearOfAcquisition: z.number(),
  amoutOfTreDays: z.number(),
  observations: z.string().optional().nullable(),
})

type CreateTreBodySchema = z.infer<typeof createTreBodySchema>

@Controller('/tre')
export class CreateTreController {
  constructor(private registerTreUseCase: RegisterTreUseCase) {}

  @Post()
  @HttpCode(201)
  @Roles([Role.ADMIN, Role.GESTOR])
  async createTre(
    @Body(new ZodValidationPipe(createTreBodySchema))
    body: CreateTreBodySchema,
    @CurrentUser() user: TokenBodySchema,
  ) {
    const {
      userId,
      amoutOfTreDays,
      firstTreDay,
      lastTreDay,
      requestType,
      yearOfAcquisition,
      observations,
      treSeiNumber,
    } = body

    const userIdToUse = userId || user.sub

    const result = await this.registerTreUseCase.execute({
      amoutOfTreDays,
      firstTreDay,
      lastTreDay,
      requestType,
      yearOfAcquisition,
      observations,
      treSeiNumber,
      userId: new UniqueEntityID(userIdToUse),
    })

    if (result.isLeft()) {
      throw new BadRequestException('Error creating TRE')
    }

    const tre = result.value.tre

    return { tre }
  }
}
