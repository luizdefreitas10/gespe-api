import { PaginationParams } from '@/core/repositories/pagination-params'
import { UserRepository } from '@/domain/app/application/repositories/user-repository'
import { User } from '@/domain/app/enterprise/entities/user'
import { PrismaService } from '../prisma.service'
import { Injectable } from '@nestjs/common'
import { PrismaUserMapper } from '../mappers/prisma-user-mapper'

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private prismaService: PrismaService) {
    super()
  }

  async createUser(user: User): Promise<void> {
    const data = PrismaUserMapper.toPersistance(user)

    await this.prismaService.user.create({
      data,
    })
  }

  async findById(userId: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        vacation: true,
        tre: true,
      },
    })

    if (!user) {
      return null
    }

    return PrismaUserMapper.toDomain(user)
  }

  async getAllUsers({ page }: PaginationParams): Promise<User[]> {
    const users = await this.prismaService.user.findMany({
      take: 20,
      skip: (page - 1) * 20,
      include: {
        vacation: true,
        tre: true,
      },
    })

    // console.log(users)

    return users.map(PrismaUserMapper.toDomain)
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
      include: {
        vacation: true,
        tre: true,
      },
    })

    if (!user) {
      return null
    }

    return PrismaUserMapper.toDomain(user)
  }

  async findByFullName(fullName: string): Promise<User | null> {
    const exact = await this.prismaService.user.findFirst({
      where: { fullName },
      include: { vacation: true, tre: true },
    })

    if (exact) return PrismaUserMapper.toDomain(exact)

    const startsWith = await this.prismaService.user.findFirst({
      where: {
        fullName: {
          startsWith: fullName,
          mode: 'insensitive',
        },
      },
      include: { vacation: true, tre: true },
    })

    if (startsWith) {
      console.warn(`   ⚠️ Nome aproximado: "${fullName}" → "${startsWith.fullName}"`)
      return PrismaUserMapper.toDomain(startsWith)
    }

    const words = fullName.trim().split(/\s+/)
    for (let i = words.length - 1; i >= 2; i--) {
      const partial = words.slice(0, i).join(' ')
      const partialMatch = await this.prismaService.user.findFirst({
        where: {
          fullName: {
            equals: partial,
            mode: 'insensitive',
          },
        },
        include: { vacation: true, tre: true },
      })

      if (partialMatch) {
        console.warn(`   ⚠️ Nome parcial: "${fullName}" → "${partialMatch.fullName}"`)
        return PrismaUserMapper.toDomain(partialMatch)
      }
    }

    return null
  }


  async delete(user: User): Promise<void> {
    await this.prismaService.user.update({
      where: {
        id: user.id.toString(),
      },
      data: {
        status: 'INACTIVE',
      },
    })
  }
}
