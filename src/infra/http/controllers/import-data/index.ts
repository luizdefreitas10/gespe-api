import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportVacationSpreadsheetUseCase } from "@/domain/app/application/use-cases/import-vacation-spreadsheet";
import { Roles } from "@/infra/auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("/import-data")
export class ImportDataController {
  constructor(
    private importVacationSpreadsheetUseCase: ImportVacationSpreadsheetUseCase
  ) {}

  @Post("/vacation-spreadsheet")
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR])
  @UseInterceptors(FileInterceptor("file"))
  async importVacationSpreadsheet(
    @UploadedFile() file: Express.Multer.File & { buffer: Buffer }
  ) {
    if (!file) {
      throw new BadRequestException("Arquivo não fornecido");
    }

    // Validar extensão do arquivo
    const allowedExtensions = [".xlsx", ".xls"];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        "Formato de arquivo inválido. Apenas arquivos Excel (.xlsx, .xls) são permitidos."
      );
    }

    const result = await this.importVacationSpreadsheetUseCase.execute({
      file,
    });

    if (result.isLeft()) {
      throw new BadRequestException(result.value.message);
    }

    return {
      message: "Importação concluída com sucesso",
      usersCreated: result.value.usersCreated,
      vacationsCreated: result.value.vacationsCreated,
      errors: result.value.errors,
    };
  }
}