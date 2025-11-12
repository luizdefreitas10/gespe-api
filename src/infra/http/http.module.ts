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

@Module({
  imports: [DatabaseModule, CryptographyModule],
  controllers: [
    CreateAccountController,
    AuthenticateController,
    FetchUsersController,
    CreateVacationController,
  ],
  providers: [RegisterUserUseCase, FetchUsersUseCase, RegisterVacationUseCase],
})
export class HttpModule {}
