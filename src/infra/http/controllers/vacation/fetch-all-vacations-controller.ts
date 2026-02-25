import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'
import { FetchAllVacationsUseCase } from '@/domain/app/application/use-cases/fetch-all-vacations'
import { VacationPresenter } from '../../presenters/http-vacation-presenter'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1))

export type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)

@Controller('/vacation')
export class FetchAllVacationsController {
  constructor(private fetchAllVacationsUseCase: FetchAllVacationsUseCase) {}

  @Get('/all')
  @Roles([Role.ADMIN, Role.GESTOR])
  async getAllVacations(
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
  ) {
    const result = await this.fetchAllVacationsUseCase.execute({
      page,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const vacations = result.value.vacations
    const count = result.value.count

    return {
      count,
      vacations: vacations.map(VacationPresenter.toHTTP),
    }
  }
}
