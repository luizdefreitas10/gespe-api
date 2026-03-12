import { PaginationParams } from '@/core/repositories/pagination-params'
import { Vacation } from '../../enterprise/entities/vacation'
import { VacationRequestType } from '@prisma/client'

export interface FindDuplicateVacationParams {
  userId: string
  firstVacationDay: Date
  lastVacationDay: Date
  requestType: VacationRequestType
  year: number
  amoutOfVacationDays: number
  vacationSeiNumber?: string | null
}

export abstract class VacationRepository {
  abstract createVacation(vacation: Vacation): Promise<void>
  abstract findById(vacationId: string): Promise<Vacation | null>
  abstract getAllVacations({
    page,
    size,
  }: PaginationParams): Promise<Vacation[] | null>

  abstract findByUserId(
    userId: string,
    { page, size }: PaginationParams,
  ): Promise<Vacation[] | null>

  abstract findByYear(userId: string, year: number): Promise<Vacation[] | null>
  abstract findDuplicateVacation(
    params: FindDuplicateVacationParams,
  ): Promise<Vacation | null>

  abstract updateVacation(vacation: Vacation): Promise<void>
  abstract deleteVacation(vacationId: string): Promise<void>
}
