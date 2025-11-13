import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { FetchUsersUseCase } from "@/domain/app/application/use-cases/fetch-users";
import { JwtAuthGuard } from "@/infra/auth/jwt-auth.guard";
import { UserPresenter } from "../../presenters/http-user-presenter";
import { ZodValidationPipe } from "../../pipes/zod-validation-pipe";
import { CurrentUser } from "@/infra/auth/current-user-decorator";
import { TokenBodySchema } from "@/infra/auth/jwt.strategy";
import { FetchVacationsByUserIdUseCase } from "@/domain/app/application/use-cases/fetch-vacations-by-userId";
import { VacationPresenter } from "../../presenters/http-vacation-presenter";
import { Roles } from "@/infra/auth/roles.decorator";
import { Role } from "@prisma/client";

const pageQueryParamSchema = z
  .string()
  .optional()
  .default("1")
  .transform(Number)
  .pipe(z.number().min(1));

export type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>;

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema);

@Controller("/vacation")
export class FetchVacationByUserIdController {
  constructor(
    private fetchVacationsByUserIdUseCase: FetchVacationsByUserIdUseCase
  ) {}

  @Get("/by-user-id")
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async getUsers(
    @CurrentUser() user: TokenBodySchema,
    @Query("page", queryValidationPipe) page: PageQueryParamSchema
  ) {

    const userId = user.sub;
    const result = await this.fetchVacationsByUserIdUseCase.execute({
      page,
      userId,
    });

    if (result.isLeft()) {
      throw new BadRequestException();
    }

    const vacations = result.value.vacations;
    // console.log(vacations);

    return {
      vacations: vacations.map(VacationPresenter.toHTTP) ?? [],
    };
  }
}
