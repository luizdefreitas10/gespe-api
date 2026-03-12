import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Query,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { TokenBodySchema } from '@/infra/auth/jwt.strategy'
import { GetVacationOverviewUseCase } from '@/domain/app/application/use-cases/get-vacation-overview'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { Roles } from '@/infra/auth/roles.decorator'
import { VacationPresenter } from '../../presenters/http-vacation-presenter'

const vacationOverviewQuerySchema = z.object({
  userId: z.string().uuid().optional(),
})

type VacationOverviewQuerySchema = z.infer<typeof vacationOverviewQuerySchema>

@Controller('/vacation/overview')
export class GetVacationOverviewController {
  constructor(private getVacationOverviewUseCase: GetVacationOverviewUseCase) {}

  @Get()
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async handle(
    @CurrentUser() user: TokenBodySchema,
    @Query(new ZodValidationPipe(vacationOverviewQuerySchema))
    query: VacationOverviewQuerySchema,
  ) {
    let userIdToQuery = query.userId

    if (user.role === Role.USER) {
      if (query.userId && query.userId !== user.sub) {
        throw new ForbiddenException(
          'Users can only access their own vacation overview',
        )
      }

      userIdToQuery = user.sub
    } else {
      userIdToQuery = query.userId ?? user.sub
    }

    if (!userIdToQuery) {
      throw new BadRequestException('User ID is required')
    }

    const result = await this.getVacationOverviewUseCase.execute({
      userId: userIdToQuery,
    })

    if (result.isLeft()) {
      throw new BadRequestException('Error calculating vacation overview')
    }

    return {
      userId: userIdToQuery,
      recordsCount: result.value.vacations.length,
      totalBalance: result.value.totalBalance,
      yearBalances: result.value.yearBalances,
      vacations: result.value.vacations.map(VacationPresenter.toHTTP),
    }
  }
}
