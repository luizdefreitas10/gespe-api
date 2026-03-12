import { Injectable } from '@nestjs/common'
import { TreRepository } from '@/domain/app/application/repositories/tre-repository'
import { Tre } from '@/domain/app/enterprise/entities/tre'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Either, right } from '@/core/either'
import { EffectiveEnjoymentEnum, TreRequestType } from '@prisma/client'
import { TreBalanceSyncService } from './tre-balance-sync.service'

export interface CreateTreRequest {
  userId: string
  firstTreDay: Date
  lastTreDay: Date
  yearOfAcquisition: number
  amoutOfTreDays: number
  requestType: TreRequestType
  treSeiNumber?: string | null
  observations?: string | null
  effectiveEnjoyment?: EffectiveEnjoymentEnum
}

export interface CreateTreResult {
  tre: Tre
  wasCreated: boolean
}

type CreateTreResponse = Either<Error, CreateTreResult>

@Injectable()
export class TreRegistrationService {
  constructor(
    private treRepository: TreRepository,
    private treBalanceSyncService: TreBalanceSyncService,
  ) {}

  async createIfNotExists(data: CreateTreRequest): Promise<CreateTreResponse> {
    const duplicateTre = await this.treRepository.findDuplicateTre({
      userId: data.userId,
      firstTreDay: data.firstTreDay,
      lastTreDay: data.lastTreDay,
      requestType: data.requestType,
      yearOfAcquisition: data.yearOfAcquisition,
      amoutOfTreDays: data.amoutOfTreDays,
      treSeiNumber: data.treSeiNumber ?? null,
    })

    if (duplicateTre) {
      return right({ tre: duplicateTre, wasCreated: false })
    }

    const tre = Tre.create({
      userId: new UniqueEntityID(data.userId),
      firstTreDay: data.firstTreDay,
      lastTreDay: data.lastTreDay,
      yearOfAcquisition: data.yearOfAcquisition,
      amoutOfTreDays: data.amoutOfTreDays,
      requestType: data.requestType,
      treSeiNumber: data.treSeiNumber ?? null,
      observations: data.observations ?? null,
      effectiveEnjoyment: data.effectiveEnjoyment ?? 'NO',
    })

    await this.treRepository.createTre(tre)
    await this.treBalanceSyncService.syncUserTotalTreDays(data.userId)

    return right({ tre, wasCreated: true })
  }
}
