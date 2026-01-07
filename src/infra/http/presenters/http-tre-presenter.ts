import { Tre } from "@/domain/app/enterprise/entities/tre";

export class TrePresenter {
  static toHTTP(tre: Tre) {
    return {
      id: tre.id,
      userId: tre.userId.toString(),
      firstTreDay: tre.firstTreDay,
      lastTreDay: tre.lastTreDay,
      treSeiNumber: tre.treSeiNumber,
      requestType: tre.requestType,
      yearOfAcquisition: tre.yearOfAcquisition,
      amoutOfTreDays: tre.amoutOfTreDays,
      observations: tre.observations,
      effectiveEnjoyment: tre.effectiveEnjoyment,
      createdAt: tre.createdAt,
      updatedAt: tre.updatedAt,
    };
  }
}

