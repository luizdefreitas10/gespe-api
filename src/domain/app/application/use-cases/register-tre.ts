import { Either, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { TreRequestType, EffectiveEnjoymentEnum } from '@prisma/client'
import { Tre } from '../../enterprise/entities/tre'
import { TreRepository } from '../repositories/tre-repository'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

interface RegisterTreUseCaseRequest {
  userId: UniqueEntityID
  firstTreDay?: Date | null
  lastTreDay?: Date | null
  treSeiNumber?: string | null
  requestType: TreRequestType
  yearOfAcquisition: number
  amoutOfTreDays: number
  observations?: string | null
  effectiveEnjoyment?: EffectiveEnjoymentEnum
}

type RegisterTreUseCaseResponse = Either<
  null,
  {
    tre: Tre
  }
>

@Injectable()
export class RegisterTreUseCase {
  constructor(private treRepository: TreRepository) {}

  async execute({
    userId,
    firstTreDay,
    lastTreDay,
    treSeiNumber,
    requestType,
    yearOfAcquisition,
    amoutOfTreDays,
    observations,
    effectiveEnjoyment,
  }: RegisterTreUseCaseRequest): Promise<RegisterTreUseCaseResponse> {
    const tre = Tre.create({
      userId,
      firstTreDay,
      lastTreDay,
      treSeiNumber,
      requestType,
      yearOfAcquisition,
      amoutOfTreDays,
      observations,
      effectiveEnjoyment: effectiveEnjoyment ?? EffectiveEnjoymentEnum.NO,
    })

    await this.treRepository.createTre(tre)

    return right({ tre })
  }
}
