import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { UserRepository } from '@/domain/app/application/repositories/user-repository'
import { PrismaUserRepository } from './prisma/repositories/prisma-user-repository'
import { VacationRepository } from '@/domain/app/application/repositories/vacation-repository'
import { PrismaVacationRepository } from './prisma/repositories/prisma-vacation-repository'
import { TreRepository } from '@/domain/app/application/repositories/tre-repository'
import { PrismaTreRepository } from './prisma/repositories/prisma-tre-repository'

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
    {
      provide: TreRepository,
      useClass: PrismaTreRepository,
    },
  ],
  exports: [PrismaService, UserRepository, VacationRepository, TreRepository],
})
export class DatabaseModule {}
