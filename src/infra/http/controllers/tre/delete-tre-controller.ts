import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Param,
} from "@nestjs/common";
import { DeleteTreUseCase } from "@/domain/app/application/use-cases/delete-tre";
import { TreNotFoundError } from "@/domain/app/application/use-cases/errors/tre-not-found";
import { Roles } from "@/infra/auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("/tre/:id")
export class DeleteTreController {
  constructor(private deleteTreUseCase: DeleteTreUseCase) {}

  @Delete()
  @HttpCode(204)
  @Roles([Role.ADMIN, Role.GESTOR])
  async deleteTre(@Param("id") id: string) {
    const result = await this.deleteTreUseCase.execute({ id });

    if (result.isLeft()) {
      const error = result.value;
      switch (error.constructor) {
        case TreNotFoundError:
          throw new BadRequestException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }
  }
}

