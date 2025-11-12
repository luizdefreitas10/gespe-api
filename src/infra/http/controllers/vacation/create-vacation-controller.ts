import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";

import { z } from "zod";
import { ZodValidationPipe } from "@/infra/http/pipes/zod-validation-pipe";
import { VacationAlreadyExistsError } from "@/domain/app/application/use-cases/errors/vacation-already-exists";
import { RegisterVacationUseCase } from "@/domain/app/application/use-cases/register-vacation";
import { CurrentUser } from "@/infra/auth/current-user-decorator";
import { TokenBodySchema } from "@/infra/auth/jwt.strategy";
import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { JwtAuthGuard } from "@/infra/auth/jwt-auth.guard";

const vacationRequestTypeEnum = z.enum([
  "ALTERACAO_DE_GOZO",
  "PROGRAMACAO_DE_FERIAS",
  "SOLICITACAO_DE_GOZO",
  "SUSPENSAO_DE_GOZO",
]);

const createVacationBodySchema = z.object({
  firstVacationDay: z.coerce.date(),
  lastVacationDay: z.coerce.date(),
  vacationSeiNumber: z.string().optional().nullable(),
  requestType: vacationRequestTypeEnum,
  year: z.number(),
  amoutOfVacationDays: z.number(),
  observations: z.string().optional().nullable(),
});

type CreateVacationBodySchema = z.infer<typeof createVacationBodySchema>;

@Controller("/vacation")
export class CreateVacationController {
  constructor(private registerVacationUseCase: RegisterVacationUseCase) {}

  @Post()
  @HttpCode(201)
  // @UsePipes(new ZodValidationPipe(createVacationBodySchema))
  @UseGuards(JwtAuthGuard)
  async createVacation(
    @Body(new ZodValidationPipe(createVacationBodySchema))
    body: CreateVacationBodySchema,
    @CurrentUser() user: TokenBodySchema
  ) {
    const {
      amoutOfVacationDays,
      firstVacationDay,
      lastVacationDay,
      requestType,
      year,
      observations,
      vacationSeiNumber,
    } = body;

    // console.log(body);

    const result = await this.registerVacationUseCase.execute({
      amoutOfVacationDays,
      firstVacationDay,
      lastVacationDay,
      requestType,
      year,
      observations,
      vacationSeiNumber,
      userId: new UniqueEntityID(user.sub),
    });

    if (result.isLeft()) {
      const error = result.value;

      switch (error.constructor) {
        case VacationAlreadyExistsError:
          throw new ConflictException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }
  }
}
