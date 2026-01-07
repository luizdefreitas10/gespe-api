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
import { z } from "zod";
import { CurrentUser } from "@/infra/auth/current-user-decorator";
import { TokenBodySchema } from "@/infra/auth/jwt.strategy";
import { GetVacationBalanceUseCase } from "@/domain/app/application/use-cases/get-vacation-balance";
import { ZodValidationPipe } from "../../pipes/zod-validation-pipe";
import { Roles } from "@/infra/auth/roles.decorator";

const vacationBalanceQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  year: z
    .string()
    .regex(/^\d+$/, "year must be a number")
    .transform((val) => Number(val))
    .refine((n) => n >= 1900 && n <= 3000, "year must be between 1900 and 3000")
    .optional(),
});

type VacationBalanceQuerySchema = z.infer<typeof vacationBalanceQuerySchema>;

@Controller("/vacation/balance")
export class GetVacationBalanceController {
  constructor(private getVacationBalanceUseCase: GetVacationBalanceUseCase) {}

  @Get()
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR, Role.USER])
  async handle(
    @CurrentUser() user: TokenBodySchema,
    @Query(new ZodValidationPipe(vacationBalanceQuerySchema)) query: VacationBalanceQuerySchema
  ) {

    let userIdToQuery = query.userId;

    if (user.role === Role.USER) {
      if (query.userId && query.userId !== user.sub) {
        throw new ForbiddenException(
          "Users can only access their own vacation balance"
        );
      }

      userIdToQuery = user.sub;
    } else {
      userIdToQuery = query.userId ?? user.sub;
    }

    if (!userIdToQuery) {
      throw new BadRequestException("User ID is required");
    }

    const year = query.year ? Number(query.year) : undefined;

    if (year && Number.isNaN(year)) {
      throw new BadRequestException('Parameter "year" must be a number');
    }

    const result = await this.getVacationBalanceUseCase.execute({
      userId: userIdToQuery,
      year,
    });

    if (result.isLeft()) {
      throw new BadRequestException("Error calculating vacation balance");
    }

    return {
      userId: userIdToQuery,
      total: result.value.total,
      used: result.value.used,
      available: result.value.available,
      year: result.value.year || null,
      message: result.value.year
        ? `Saldo de férias para o ano ${result.value.year}`
        : "Saldo total de férias (todos os anos)",
    };
  }
}
