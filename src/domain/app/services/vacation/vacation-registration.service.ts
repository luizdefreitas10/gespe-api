import { Injectable } from '@nestjs/common'
import { VacationRepository } from '@/domain/app/application/repositories/vacation-repository'
import { Vacation } from '@/domain/app/enterprise/entities/vacation'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Either, right } from '@/core/either'
import { VacationRequestType, EffectiveEnjoymentEnum } from '@prisma/client'

export interface CreateVacationRequest {
  userId: string
  firstVacationDay: Date
  lastVacationDay: Date
  year: number
  amoutOfVacationDays: number
  requestType: VacationRequestType
  vacationSeiNumber?: string | null
  observations?: string | null
  effectiveEnjoyment: EffectiveEnjoymentEnum
}

type CreateVacationResponse = Either<Error, Vacation>

@Injectable()
export class VacationRegistrationService {
  constructor(private vacationRepository: VacationRepository) {}

  async create(data: CreateVacationRequest): Promise<CreateVacationResponse> {
    const vacation = Vacation.create({
      userId: new UniqueEntityID(data.userId),
      firstVacationDay: data.firstVacationDay,
      lastVacationDay: data.lastVacationDay,
      year: data.year,
      amoutOfVacationDays: data.amoutOfVacationDays,
      requestType: data.requestType,
      vacationSeiNumber: data.vacationSeiNumber ?? null,
      observations: data.observations ?? null,
      effectiveEnjoyment: data.effectiveEnjoyment,
    })

    await this.vacationRepository.createVacation(vacation)

    return right(vacation)
  }
}