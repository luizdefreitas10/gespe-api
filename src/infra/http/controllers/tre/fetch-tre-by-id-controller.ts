import { Roles } from '@/infra/auth/roles.decorator'
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { TrePresenter } from '../../presenters/http-tre-presenter'
import { TreNotFoundError } from '@/domain/app/application/use-cases/errors/tre-not-found'
import { FetchTreByIdUseCase } from '@/domain/app/application/use-cases/fetch-tre-by-id'

@Controller('/tre/id/:id')
export class FetchTreByIdController {
  constructor(private fetchTreByIdUseCase: FetchTreByIdUseCase) {}

  @Get()
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async handle(@Param('id') id: string) {
    const result = await this.fetchTreByIdUseCase.execute({ id })

    if (result.isLeft()) {
      const error = result.value
      switch (error.constructor) {
        case TreNotFoundError:
          throw new BadRequestException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    const tre = TrePresenter.toHTTP(result.value.tre)

    return { tre }
  }
}
