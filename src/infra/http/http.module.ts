import { Module } from '@nestjs/common'
import { AuthenticateController } from './controllers/auth/authenticate-controller'
import { CreateAccountController } from './controllers/user/create-account-controller'
import { DatabaseModule } from '../database/database.module'
import { RegisterUserUseCase } from '@/domain/app/application/use-cases/register-user'
import { CryptographyModule } from '../cryptography/cryptography.module'
import { FetchUsersUseCase } from '@/domain/app/application/use-cases/fetch-users'
import { FetchUsersController } from './controllers/user/fetch-users-controller'
import { CreateVacationController } from './controllers/vacation/create-vacation-controller'
import { RegisterVacationUseCase } from '@/domain/app/application/use-cases/register-vacation'
import { FetchVacationsByUserIdUseCase } from '@/domain/app/application/use-cases/fetch-vacations-by-userId'
import { FetchVacationByUserIdController } from './controllers/vacation/fetch-vacation-by-userid-controller'
import { FetchAllVacationsController } from './controllers/vacation/fetch-all-vacations-controller'
import { FetchAllVacationsUseCase } from '@/domain/app/application/use-cases/fetch-all-vacations'
import { FetchVacationByIdController } from './controllers/vacation/fetch-vacation-by-id-controller'
import { FetchVacationByIdUseCase } from '@/domain/app/application/use-cases/fetch-vacation-by-id'
import { FetchVacationByYearAndUserIdController } from './controllers/vacation/find-vacation-by-year-controller'
import { FetchVacationByYearAndUserIdUseCase } from '@/domain/app/application/use-cases/fetch-vacation-by-year-and-user-id'
import { HelloWorldController } from './controllers/user/hello-controller'
import { FetchUserByIdController } from './controllers/user/fetch-user-by-id.controller'
import { FetchUserByIdUseCase } from '@/domain/app/application/use-cases/fetch-user-by-id'
import { GetVacationBalanceController } from './controllers/vacation/get-vacation-balance-controller'
import { GetVacationBalanceUseCase } from '@/domain/app/application/use-cases/get-vacation-balance'
import { GetTreBalanceController } from './controllers/tre/get-tre-balance-controller'
import { GetTreBalanceUseCase } from '@/domain/app/application/use-cases/get-tre-balance'
import { CreateTreController } from './controllers/tre/create-tre-controller'
import { RegisterTreUseCase } from '@/domain/app/application/use-cases/register-tre'
import { FetchTreByIdController } from './controllers/tre/fetch-tre-by-id-controller'
import { FetchTreByIdUseCase } from '@/domain/app/application/use-cases/fetch-tre-by-id'
import { FetchAllTresController } from './controllers/tre/fetch-all-tres-controller'
import { FetchAllTresUseCase } from '@/domain/app/application/use-cases/fetch-all-tres'
import { FetchTresByUserIdController } from './controllers/tre/fetch-tres-by-userId-controller'
import { FetchTresByUserIdUseCase } from '@/domain/app/application/use-cases/fetch-tres-by-userId'
import { UpdateTreController } from './controllers/tre/update-tre-controller'
import { UpdateTreUseCase } from '@/domain/app/application/use-cases/update-tre'
import { DeleteTreController } from './controllers/tre/delete-tre-controller'
import { DeleteTreUseCase } from '@/domain/app/application/use-cases/delete-tre'
import { ImportDataController } from "./controllers/import-data/import-data.controller";
import { ImportVacationSpreadsheetUseCase } from '@/domain/app/application/use-cases/import-vacation-spreadsheet'
import { ImportTreSpreadsheetUseCase } from '@/domain/app/application/use-cases/import-tre-spreadsheet'
import { UserRegistrationService } from '@/domain/app/services/user/user-registration.service'
import { VacationRegistrationService } from '@/domain/app/services/vacation/vacation-registration.service'
import { TreSheetParserService } from '@/domain/app/application/parsers/tre-sheet-parser.service'
import { ExcelReaderService } from '@/domain/app/application/parsers/excel-reader.service'
import { UserSheetMatcherService } from '@/domain/app/application/parsers/user-sheet-matcher.service'
import { VacationSheetParserService } from '@/domain/app/application/parsers/vacation-sheet-parser.service'

@Module({
  imports: [DatabaseModule, CryptographyModule],
  controllers: [
    CreateAccountController,
    AuthenticateController,
    FetchUserByIdController,
    FetchUsersController,
    CreateVacationController,
    FetchVacationByUserIdController,
    FetchAllVacationsController,
    FetchVacationByIdController,
    FetchVacationByYearAndUserIdController,
    GetVacationBalanceController,
    GetTreBalanceController,
    CreateTreController,
    FetchTreByIdController,
    FetchAllTresController,
    FetchTresByUserIdController,
    UpdateTreController,
    DeleteTreController,
    HelloWorldController,
    ImportDataController,
  ],
  providers: [
    RegisterUserUseCase,
    FetchUsersUseCase,
    RegisterVacationUseCase,
    FetchVacationsByUserIdUseCase,
    FetchAllVacationsUseCase,
    FetchVacationByIdUseCase,
    FetchVacationByYearAndUserIdUseCase,
    FetchUserByIdUseCase,
    GetVacationBalanceUseCase,
    GetTreBalanceUseCase,
    RegisterTreUseCase,
    TreSheetParserService,
    ImportTreSpreadsheetUseCase,
    FetchTreByIdUseCase,
    FetchAllTresUseCase,
    FetchTresByUserIdUseCase,
    UpdateTreUseCase,
    DeleteTreUseCase,
    ImportVacationSpreadsheetUseCase,
    ExcelReaderService,
    UserSheetMatcherService,
    VacationSheetParserService,
    UserRegistrationService,
    VacationRegistrationService,
  ],
})
export class HttpModule {}
