import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { UserRepository } from '@/domain/app/application/repositories/user-repository'
import { PrismaUserRepository } from './prisma/repositories/prisma-user-repository'
import { VacationRepository } from '@/domain/app/application/repositories/vacation-repository'
import { PrismaVacationRepository } from './prisma/repositories/prisma-vacation-repository'

@Module({
  providers: [
    PrismaService,
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: VacationRepository,
      useClass: PrismaVacationRepository,
    },
  ],
  exports: [PrismaService, UserRepository, VacationRepository],
})
export class DatabaseModule {}
