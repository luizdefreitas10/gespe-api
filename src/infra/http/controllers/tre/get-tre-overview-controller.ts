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
import { GetTreOverviewUseCase } from '@/domain/app/application/use-cases/get-tre-overview'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { Roles } from '@/infra/auth/roles.decorator'
import { TrePresenter } from '../../presenters/http-tre-presenter'

const treOverviewQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  year: z
    .string()
    .regex(/^\d+$/, 'year must be a number')
    .transform((val) => Number(val))
    .refine((n) => n >= 1900 && n <= 3000, 'year must be between 1900 and 3000')
    .optional(),
})

type TreOverviewQuerySchema = z.infer<typeof treOverviewQuerySchema>

@Controller('/tre/overview')
export class GetTreOverviewController {
  constructor(private getTreOverviewUseCase: GetTreOverviewUseCase) {}

  @Get()
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async handle(
    @CurrentUser() user: TokenBodySchema,
    @Query(new ZodValidationPipe(treOverviewQuerySchema))
    query: TreOverviewQuerySchema,
  ) {
    let userIdToQuery = query.userId

    if (user.role === Role.USER) {
      if (query.userId && query.userId !== user.sub) {
        throw new ForbiddenException('Users can only access their own TRE overview')
      }

      userIdToQuery = user.sub
    } else {
      userIdToQuery = query.userId ?? user.sub
    }

    if (!userIdToQuery) {
      throw new BadRequestException('User ID is required')
    }

    const year = query.year ? Number(query.year) : undefined

    if (year && Number.isNaN(year)) {
      throw new BadRequestException('Parameter "year" must be a number')
    }

    const result = await this.getTreOverviewUseCase.execute({
      userId: userIdToQuery,
      year,
    })

    if (result.isLeft()) {
      throw new BadRequestException('Error calculating TRE overview')
    }

    return {
      userId: userIdToQuery,
      selectedYear: result.value.selectedYear,
      totalRecordsCount: result.value.totalRecordsCount,
      filteredRecordsCount: result.value.filteredRecordsCount,
      totalBalance: result.value.totalBalance,
      yearBalances: result.value.yearBalances,
      tres: result.value.tres.map(TrePresenter.toHTTP),
    }
  }
}
