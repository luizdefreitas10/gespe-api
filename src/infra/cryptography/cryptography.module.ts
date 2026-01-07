import { Encrypter } from "@/domain/app/application/cryptography/encrypter";
import { HashComparer } from "@/domain/app/application/cryptography/hash-comparer";
import { HashGenerator } from "@/domain/app/application/cryptography/hash-generator";
import { Module } from "@nestjs/common";
import { JwtEncrypter } from "./jwt-encrypter";
import { BcryptHasher } from "./bcrypt-hasher";
import { EncrypterValidationToken } from "@/domain/app/application/cryptography/encrypter-account-validation";
import { JwtEncrypterAccountValidation } from "./jwt-encrypter-account-vallidation";

@Module({
  providers: [
    {
      provide: Encrypter,
      useClass: JwtEncrypter,
    },
    {
      provide: HashComparer,
      useClass: BcryptHasher,
    },
    {
      provide: HashGenerator,
      useClass: BcryptHasher,
    },
    {
      provide: EncrypterValidationToken,
      useClass: JwtEncrypterAccountValidation,
    },
  ],
  exports: [Encrypter, HashComparer, HashGenerator],
})
export class CryptographyModule {}
