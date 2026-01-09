import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Query,
} from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { TokenBodySchema } from '@/infra/auth/jwt.strategy'
import { FetchTresByUserIdUseCase } from '@/domain/app/application/use-cases/fetch-tres-by-userId'
import { TrePresenter } from '../../presenters/http-tre-presenter'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1))

export type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)

@Controller('/tre')
export class FetchTresByUserIdController {
  constructor(private fetchTresByUserIdUseCase: FetchTresByUserIdUseCase) {}

  @Get('/by-user-id')
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async getTresByUserId(
    @CurrentUser() user: TokenBodySchema,
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
  ) {
    const userId = user.sub
    const result = await this.fetchTresByUserIdUseCase.execute({
      page,
      userId,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const tres = result.value.tres

    return {
      tres: tres.map(TrePresenter.toHTTP) ?? [],
    }
  }
}
