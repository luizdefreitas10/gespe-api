import { PaginationParams } from '@/core/repositories/pagination-params'
import { PrismaService } from '../prisma.service'
import { Injectable } from '@nestjs/common'
import { VacationRepository } from '@/domain/app/application/repositories/vacation-repository'
import { Vacation } from '@/domain/app/enterprise/entities/vacation'
import { PrismaVacationMapper } from '../mappers/prisma-vacation-mapper'

@Injectable()
export class PrismaVacationRepository extends VacationRepository {
  constructor(private prismaService: PrismaService) {
    super()
  }

  async createVacation(vacation: Vacation): Promise<void> {
    const data = PrismaVacationMapper.toPersistance(vacation)

    await this.prismaService.vacation.create({
      data,
    })
  }

  async findById(vacationId: string): Promise<Vacation | null> {
    const vacation = await this.prismaService.vacation.findUnique({
      where: {
        id: vacationId,
      },
    })

    if (!vacation) {
      return null
    }

    return PrismaVacationMapper.toDomain(vacation)
  }

  async getAllVacations({ page, size }: PaginationParams): Promise<Vacation[]> {
    const vacations = await this.prismaService.vacation.findMany({
      take: size || 20,
      skip: (page - 1) * 20,
    })

    return vacations.map(PrismaVacationMapper.toDomain)
  }

  async findByUserId(
    userId: string,
    { page, size },
  ): Promise<Vacation[] | null> {
    // console.log(userId);
    const vacation = await this.prismaService.vacation.findMany({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    })

    if (!vacation) {
      return null
    }

    // console.log(vacation);

    return vacation.map(PrismaVacationMapper.toDomain)
  }

  async findByYear(userId: string, year: number): Promise<Vacation[] | null> {
    const vacations = await this.prismaService.vacation.findMany({
      where: {
        userId,
        year,
      },
    })

    if (!vacations) {
      return null
    }

    return vacations.map(PrismaVacationMapper.toDomain)
  }

  async updateVacation(vacation: Vacation): Promise<void> {
    const prismaVacation = PrismaVacationMapper.toPersistance(vacation)

    await this.prismaService.vacation.update({
      where: {
        id: prismaVacation.id,
      },
      data: prismaVacation,
    })
  }

  async deleteVacation(vacationId: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
