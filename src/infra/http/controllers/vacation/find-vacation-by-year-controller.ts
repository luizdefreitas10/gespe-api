import { Roles } from "@/infra/auth/roles.decorator";
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Query,
  UsePipes,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { VacationPresenter } from "../../presenters/http-vacation-presenter";
import { VacationNotFoundError } from "@/domain/app/application/use-cases/errors/vacation-not-found";
import { z } from "zod";
import { CurrentUser } from "@/infra/auth/current-user-decorator";
import { TokenBodySchema } from "@/infra/auth/jwt.strategy";
import { FetchVacationByYearAndUserIdUseCase } from "@/domain/app/application/use-cases/fetch-vacation-by-year-and-user-id";
import { ZodValidationPipe } from "../../pipes/zod-validation-pipe";

export const vacationQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  year: z
    .string()
    .regex(/^\d+$/, "year must be a number")
    .transform((val) => Number(val))
    .refine((n) => n >= 1900 && n <= 3000, "year must be between 1900 and 3000")
    .optional(),
});

export type VacationQuerySchema = z.infer<typeof vacationQuerySchema>;

@Controller("/vacation")
export class FetchVacationByYearAndUserIdController {
  constructor(
    private fetchVacationByYearAndUserIdUseCase: FetchVacationByYearAndUserIdUseCase
  ) {}

  @Get()
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  @UsePipes(new ZodValidationPipe(vacationQuerySchema))
  async handle(
    @CurrentUser() user: TokenBodySchema,
    @Query() query: VacationQuerySchema
  ) {
    const year = query.year ? Number(query.year) : new Date().getFullYear();

    if (Number.isNaN(year)) {
      throw new BadRequestException('Parameter "year" must be a number');
    }

    let userIdToQuery = query.userId;

    if (user.role === Role.USER) {
      // USER só pode consultar a si mesmo
      if (query.userId && query.userId !== user.sub) {
        throw new ForbiddenException(
          "Users can only access their own vacations"
        );
      }

      userIdToQuery = user.sub;
    } else {
      // ADMIN/GESTOR podem consultar qualquer user
      userIdToQuery = query.userId ?? user.sub;
    }

    const result = await this.fetchVacationByYearAndUserIdUseCase.execute({
      userId: userIdToQuery,
      year,
    });

    if (result.isLeft()) {
      const error = result.value;
      switch (error.constructor) {
        case VacationNotFoundError:
          throw new BadRequestException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    const vacations = result.value.vacations;
    const payload = vacations.map(VacationPresenter.toHTTP);

    return {
      count: payload.length,
      vacations: payload,
    };
  }
}
