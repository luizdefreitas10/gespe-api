import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ImportVacationSpreadsheetUseCase } from '@/domain/app/application/use-cases/import-vacation-spreadsheet'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'

type MulterFile = Express.Multer.File

@Controller('/import-data')
export class ImportVacationSpreadsheetController {
  constructor(
    private importVacationSpreadsheetUseCase: ImportVacationSpreadsheetUseCase,
  ) {}

  @Post('/vacation-spreadsheet')
  @HttpCode(200)
  @Roles([Role.ADMIN, Role.GESTOR])
  @UseInterceptors(FileInterceptor('file'))
  async importVacationSpreadsheet(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new BadRequestException('Arquivo não fornecido')
    }

    const allowedExtensions = ['.xlsx', '.xls']
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'))

    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        'Formato de arquivo inválido. Apenas arquivos Excel (.xlsx, .xls) são permitidos.',
      )
    }

    const result = await this.importVacationSpreadsheetUseCase.execute({
      file: file.buffer,
    })

    if (result.isLeft()) {
      throw new BadRequestException(result.value.message)
    }

    return {
      message: 'Importação concluída com sucesso',
      totalUsersInSpreadsheet: result.value.totalUsersInSpreadsheet,
      processedUsers: result.value.processedUsers,
      usersCreated: result.value.usersCreated,
      usersAlreadyExisted: result.value.usersAlreadyExisted,
      usersWithErrors: result.value.usersWithErrors,
      vacationsCreated: result.value.vacationsCreated,
      vacationsAlreadyExisted: result.value.vacationsAlreadyExisted,
      vacationsWithErrors: result.value.vacationsWithErrors,
      vacationErrors: result.value.vacationErrors,
      extractionErrors: result.value.extractionErrors,
      users: result.value.users,
    }
  }
}
