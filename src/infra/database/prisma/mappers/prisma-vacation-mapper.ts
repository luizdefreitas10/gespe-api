import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { Vacation } from "@/domain/app/enterprise/entities/vacation";
import { Prisma, Vacation as PrismaVacation } from "@prisma/client";

export class PrismaVacationMapper {
  static toDomain(raw: PrismaVacation): Vacation {
    return Vacation.create(
      {
        userId: new UniqueEntityID(raw.userId),
        firstVacationDay: raw.firstVacationDay,
        lastVacationDay: raw.lastVacationDay,
        vacationSeiNumber: raw.vacationSeiNumber,
        requestType: raw.requestType,
        year: raw.year,
        amoutOfVacationDays: raw.amoutOfVacationDays,
        observations: raw.observations,
        effectiveEnjoyment: raw.effectiveEnjoyment,
        createdAt: raw.creteadAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id)
    );
  }

  static toPersistance(
    vacation: Vacation
  ): Prisma.VacationUncheckedCreateInput {
    return {
      userId: vacation.userId.toString(),
      firstVacationDay: vacation.firstVacationDay,
      lastVacationDay: vacation.lastVacationDay,
      vacationSeiNumber: vacation.vacationSeiNumber,
      requestType: vacation.requestType,
      year: vacation.year,
      amoutOfVacationDays: vacation.amoutOfVacationDays,
      observations: vacation.observations,
      effectiveEnjoyment: vacation.effectiveEnjoyment,
      creteadAt: vacation.createdAt,
      updatedAt: vacation.updatedAt ?? undefined,
    };
  }
}
