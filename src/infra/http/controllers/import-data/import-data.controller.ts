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
import { ImportTreSpreadsheetUseCase } from '@/domain/app/application/use-cases/import-tre-spreadsheet'
import { Roles } from '@/infra/auth/roles.decorator'
import { Role } from '@prisma/client'

@Controller('import-data')
export class ImportDataController {
  constructor(
    private importVacationSpreadsheetUseCase: ImportVacationSpreadsheetUseCase,
    private importTreSpreadsheetUseCase: ImportTreSpreadsheetUseCase,
  ) {}

  @Post('vacation-spreadsheet')
  @HttpCode(200)
  @Roles([Role.ADMIN])
  @UseInterceptors(FileInterceptor('file'))
  async importVacationSpreadsheet(
    @UploadedFile() file: {
      buffer: Buffer
      originalname: string
      mimetype: string
    },
  ) {
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
      usersCreated: result.value.usersCreated,
      vacationsCreated: result.value.vacationsCreated,
      errors: result.value.errors,
    }
  }

  @Post('tre-spreadsheet')
@HttpCode(200)
@Roles([Role.ADMIN])
@UseInterceptors(FileInterceptor('file'))
async importTreSpreadsheet(
  @UploadedFile() file: {
    buffer: Buffer
    originalname: string
    mimetype: string
  },
) {
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

  const result = await this.importTreSpreadsheetUseCase.execute({
    file: file.buffer,
  })

  if (result.isLeft()) {
    throw new BadRequestException(result.value.message)
  }

  return {
    message: 'Importação TRE concluída com sucesso',
    tresCreated: result.value.tresCreated,
    errors: result.value.errors,
  }
}
}