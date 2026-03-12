import { PaginationParams } from '@/core/repositories/pagination-params'
import { Tre } from '../../enterprise/entities/tre'
import { TreRequestType } from '@prisma/client'

export interface FindDuplicateTreParams {
  userId: string
  firstTreDay: Date
  lastTreDay: Date
  requestType: TreRequestType
  yearOfAcquisition: number
  amoutOfTreDays: number
  treSeiNumber?: string | null
}

export abstract class TreRepository {
  abstract createTre(tre: Tre): Promise<void>
  abstract findById(treId: string): Promise<Tre | null>
  abstract getAllTres({ page, size }: PaginationParams): Promise<Tre[] | null>
  abstract findByUserId(
    userId: string,
    pagination?: PaginationParams,
  ): Promise<Tre[] | null>

  abstract findByYearOfAcquisition(
    userId: string,
    yearOfAcquisition: number,
  ): Promise<Tre[] | null>

  abstract findDuplicateTre(params: FindDuplicateTreParams): Promise<Tre | null>

  abstract updateTre(tre: Tre): Promise<void>
  abstract deleteTre(treId: string): Promise<void>
}
