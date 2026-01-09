import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'
import { FetchAllTresUseCase } from '@/domain/app/application/use-cases/fetch-all-tres'
import { TrePresenter } from '../../presenters/http-tre-presenter'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1))

export type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)

@Controller('/tre')
export class FetchAllTresController {
  constructor(private fetchAllTresUseCase: FetchAllTresUseCase) {}

  @Get('/all')
  @Roles([Role.ADMIN, Role.GESTOR])
  async getAllTres(
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
  ) {
    const result = await this.fetchAllTresUseCase.execute({
      page,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const tres = result.value.tres
    const count = result.value.count

    return {
      count,
      tres: tres.map(TrePresenter.toHTTP),
    }
  }
}
