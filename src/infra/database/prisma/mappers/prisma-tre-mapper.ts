import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Tre } from '@/domain/app/enterprise/entities/tre'
import { Prisma, Tre as PrismaTre } from '@prisma/client'

export class PrismaTreMapper {
  static toDomain(raw: PrismaTre): Tre {
    return Tre.create(
      {
        userId: new UniqueEntityID(raw.userId),
        firstTreDay: raw.firstTreDay,
        lastTreDay: raw.lastTreDay,
        treSeiNumber: raw.treSeiNumber,
        requestType: raw.requestType,
        yearOfAcquisition: raw.yearOfAcquisition,
        amoutOfTreDays: raw.amoutOfTreDays,
        observations: raw.observations,
        effectiveEnjoyment: raw.effectiveEnjoyment,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistance(tre: Tre): Prisma.TreUncheckedCreateInput {
    return {
      userId: tre.userId.toString(),
      firstTreDay: tre.firstTreDay ?? null,
      lastTreDay: tre.lastTreDay ?? null,
      treSeiNumber: tre.treSeiNumber,
      requestType: tre.requestType,
      yearOfAcquisition: tre.yearOfAcquisition,
      amoutOfTreDays: tre.amoutOfTreDays,
      observations: tre.observations,
      effectiveEnjoyment: tre.effectiveEnjoyment ?? 'NO',
      createdAt: tre.createdAt,
      updatedAt: tre.updatedAt ?? undefined,
    }
  }
}
