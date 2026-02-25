import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Put,
} from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { UpdateTreUseCase } from '@/domain/app/application/use-cases/update-tre'
import { TreNotFoundError } from '@/domain/app/application/use-cases/errors/tre-not-found'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'

const treRequestTypeEnum = z.enum([
  'INCLUIR_SALDO',
  'SOLICITACAO_DE_GOZO',
  'CANCELAMENTO_DE_GOZO',
])

const updateTreBodySchema = z.object({
  firstTreDay: z.coerce.date().optional().nullable(),
  lastTreDay: z.coerce.date().optional().nullable(),
  treSeiNumber: z.string().optional().nullable(),
  requestType: treRequestTypeEnum.optional(),
  yearOfAcquisition: z.number().optional(),
  amoutOfTreDays: z.number().optional(),
  observations: z.string().optional().nullable(),
})

type UpdateTreBodySchema = z.infer<typeof updateTreBodySchema>

@Controller('/tre/:id')
export class UpdateTreController {
  constructor(private updateTreUseCase: UpdateTreUseCase) {}

  @Put()
  @HttpCode(204)
  @Roles([Role.ADMIN, Role.GESTOR])
  async updateTre(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTreBodySchema))
    body: UpdateTreBodySchema,
  ) {
    const result = await this.updateTreUseCase.execute({
      id,
      ...body,
    })

    if (result.isLeft()) {
      const error = result.value
      switch (error.constructor) {
        case TreNotFoundError:
          throw new BadRequestException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }
  }
}
