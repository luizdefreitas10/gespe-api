import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { FetchUsersUseCase } from '@/domain/app/application/use-cases/fetch-users'
import { UserPresenter } from '../../presenters/http-user-presenter'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
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

@Controller('/accounts')
export class FetchUsersController {
  constructor(private fetchUsersUseCase: FetchUsersUseCase) {}

  @Get()
  @Roles([Role.ADMIN, Role.GESTOR])
  async getUsers(
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
  ) {
    const result = await this.fetchUsersUseCase.execute({
      page,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const users = result.value.users

    return { users: users.map(UserPresenter.toHTTP) }
  }
}
