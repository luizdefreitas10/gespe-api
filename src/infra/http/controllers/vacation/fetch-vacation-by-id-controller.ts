import { Roles } from '@/infra/auth/roles.decorator'
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { VacationPresenter } from '../../presenters/http-vacation-presenter'
import { VacationNotFoundError } from '@/domain/app/application/use-cases/errors/vacation-not-found'
import { FetchVacationByIdUseCase } from '@/domain/app/application/use-cases/fetch-vacation-by-id'

@Controller('/vacation/id/:id')
export class FetchVacationByIdController {
  constructor(private fetchVacationByIdUseCase: FetchVacationByIdUseCase) {}

  @Get()
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async handle(@Param('id') id: string) {
    const result = await this.fetchVacationByIdUseCase.execute({ id })

    if (result.isLeft()) {
      const error = result.value
      switch (error.constructor) {
        case VacationNotFoundError:
          throw new BadRequestException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    const vacation = VacationPresenter.toHTTP(result.value.vacation)

    return { vacation }
  }
}
