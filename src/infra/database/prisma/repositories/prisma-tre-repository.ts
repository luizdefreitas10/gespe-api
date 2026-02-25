import { PaginationParams } from '@/core/repositories/pagination-params'
import { PrismaService } from '../prisma.service'
import { Injectable } from '@nestjs/common'
import { TreRepository } from '@/domain/app/application/repositories/tre-repository'
import { Tre } from '@/domain/app/enterprise/entities/tre'
import { PrismaTreMapper } from '../mappers/prisma-tre-mapper'

@Injectable()
export class PrismaTreRepository extends TreRepository {
  constructor(private prismaService: PrismaService) {
    super()
  }

  async createTre(tre: Tre): Promise<void> {
    const data = PrismaTreMapper.toPersistance(tre)

    await this.prismaService.tre.create({
      data,
    })
  }

  async findById(treId: string): Promise<Tre | null> {
    const tre = await this.prismaService.tre.findUnique({
      where: {
        id: treId,
      },
    })

    if (!tre) {
      return null
    }

    return PrismaTreMapper.toDomain(tre)
  }

  async getAllTres({ page, size }: PaginationParams): Promise<Tre[]> {
    const tres = await this.prismaService.tre.findMany({
      take: size || 20,
      skip: (page - 1) * 20,
    })

    return tres.map(PrismaTreMapper.toDomain)
  }

  async findByUserId(
    userId: string,
    pagination?: PaginationParams,
  ): Promise<Tre[] | null> {
    const tres = await this.prismaService.tre.findMany({
      where: {
        userId,
      },
      include: {
        user: true,
      },
      take: pagination?.size || 20,
      skip: pagination ? (pagination.page - 1) * (pagination.size || 20) : 0,
    })

    if (!tres) {
      return null
    }

    return tres.map(PrismaTreMapper.toDomain)
  }

  async findByYearOfAcquisition(
    userId: string,
    yearOfAcquisition: number,
  ): Promise<Tre[] | null> {
    const tres = await this.prismaService.tre.findMany({
      where: {
        userId,
        yearOfAcquisition,
      },
    })

    if (!tres) {
      return null
    }

    return tres.map(PrismaTreMapper.toDomain)
  }

  async updateTre(tre: Tre): Promise<void> {
    const prismaTre = PrismaTreMapper.toPersistance(tre)

    await this.prismaService.tre.update({
      where: {
        id: prismaTre.id,
      },
      data: prismaTre,
    })
  }

  async deleteTre(treId: string): Promise<void> {
    await this.prismaService.tre.delete({
      where: {
        id: treId,
      },
    })
  }
}
