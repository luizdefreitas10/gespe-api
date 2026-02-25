import { BadRequestException, Controller, Get, Param } from '@nestjs/common'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'
import { FetchUserByIdUseCase } from '@/domain/app/application/use-cases/fetch-user-by-id'
import { UserByIdPresenter } from '@/infra/http/presenters/http-user-by-id'

@Controller('/accounts/id/:id')
export class FetchUserByIdController {
  constructor(private fetchUserByIdUseCase: FetchUserByIdUseCase) {}

  @Get()
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async getUserById(@Param('id') id: string) {
    const result = await this.fetchUserByIdUseCase.execute({ id })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const user = result.value.user

    return { user: UserByIdPresenter.toHTTP(user) }
  }
}
