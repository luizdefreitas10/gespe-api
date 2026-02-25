import { Vacation } from '@/domain/app/enterprise/entities/vacation'

export class VacationPresenter {
  // ou static present()
  static toHTTP(vacation: Vacation) {
    return {
      id: vacation.id,
      userId: vacation.userId.toString(),
      firstVacationDay: vacation.firstVacationDay,
      lastVacationDay: vacation.lastVacationDay,
      vacationSeiNumber: vacation.vacationSeiNumber,
      requestType: vacation.requestType,
      year: vacation.year,
      amoutOfVacationDays: vacation.amoutOfVacationDays,
      observations: vacation.observations,
      effectiveEnjoyment: vacation.effectiveEnjoyment,
      createdAt: vacation.createdAt,
      updatedAt: vacation.updatedAt,
    }
  }
}
