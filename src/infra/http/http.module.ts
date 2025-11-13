import { Module } from "@nestjs/common";
import { AuthenticateController } from "./controllers/auth/authenticate-controller";
import { CreateAccountController } from "./controllers/user/create-account-controller";
import { DatabaseModule } from "../database/database.module";
import { RegisterUserUseCase } from "@/domain/app/application/use-cases/register-user";
import { CryptographyModule } from "../cryptography/cryptography.module";
import { FetchUsersUseCase } from "@/domain/app/application/use-cases/fetch-users";
import { FetchUsersController } from "./controllers/user/fetch-users-controller";
import { CreateVacationController } from "./controllers/vacation/create-vacation-controller";
import { RegisterVacationUseCase } from "@/domain/app/application/use-cases/register-vacation";
import { FetchVacationsByUserIdUseCase } from "@/domain/app/application/use-cases/fetch-vacations-by-userId";
import { FetchVacationByUserIdController } from "./controllers/vacation/fetch-vacation-by-userid-controller";

@Module({
  imports: [DatabaseModule, CryptographyModule],
  controllers: [
    CreateAccountController,
    AuthenticateController,
    FetchUsersController,
    CreateVacationController,
    FetchVacationByUserIdController,
  ],
  providers: [
    RegisterUserUseCase,
    FetchUsersUseCase,
    RegisterVacationUseCase,
    FetchVacationsByUserIdUseCase,
  ],
})
export class HttpModule {}
