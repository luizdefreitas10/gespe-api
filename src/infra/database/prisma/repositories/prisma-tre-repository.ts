import { PaginationParams } from "@/core/repositories/pagination-params";
import { PrismaService } from "../prisma.service";
import { Injectable } from "@nestjs/common";
import { TreRepository } from "@/domain/app/application/repositories/tre-repository";
import { Tre } from "@/domain/app/enterprise/entities/tre";
import { PrismaTreMapper } from "../mappers/prisma-tre-mapper";

@Injectable()
export class PrismaTreRepository extends TreRepository {
  constructor(private prismaService: PrismaService) {
    super();
  }

  async createTre(tre: Tre): Promise<void> {
    const data = PrismaTreMapper.toPersistance(tre);
    await this.prismaService.tre.create({
      data,
    });
  }

  async findById(treId: string): Promise<Tre | null> {
    const tre = await this.prismaService.tre.findUnique({
      where: {
        id: treId,
      },
    });

    if (!tre) {
      return null;
    }

    return PrismaTreMapper.toDomain(tre);
  }

  async getAllTres({ page, size }: PaginationParams): Promise<Tre[]> {
    const tre = await this.prismaService.tre.findMany({
      take: size || 20,
      skip: (page - 1) * 20,
    });

    return tre.map(PrismaTreMapper.toDomain);
  }

  async findByUserId(userId: string): Promise<Tre[] | null> {
    const tre = await this.prismaService.tre.findMany({
      where: {
        userId: userId,
      },
    });

    if (!tre) {
      return null;
    }

    return tre.map(PrismaTreMapper.toDomain);
  }

  async findByYearOfAcquisition(
    userId: string,
    year: number
  ): Promise<Tre[] | null> {
    const tre = await this.prismaService.tre.findMany({
      where: {
        userId,
        yearOfAcquisition: year,
      },
    });

    if (!tre) {
      return null;
    }

    return tre.map(PrismaTreMapper.toDomain);
  }

  async updateTre(tre: Tre): Promise<void> {
    const prismaTre = PrismaTreMapper.toPersistance(tre);

    await this.prismaService.tre.update({
      where: {
        id: tre.id.toString(),
      },
      data: prismaTre,
    });
  }
  deleteTre(treId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
