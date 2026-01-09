import { Either, left, right } from '@/core/either'
import { Injectable } from '@nestjs/common'
import { Vacation } from '@/domain/app/enterprise/entities/vacation'
import { VacationRepository } from '@/domain/app/application/repositories/vacation-repository'

interface FetchAllVacationsUseCaseRequest {
  page: number
}

type FetchAllVacationsUseCaseResponse = Either<
  null,
  {
    vacations: Vacation[]
    count: number
  }
>

@Injectable()
export class FetchAllVacationsUseCase {
  constructor(private vacationRepository: VacationRepository) {}

  async execute({
    page,
  }: FetchAllVacationsUseCaseRequest): Promise<FetchAllVacationsUseCaseResponse> {
    const vacations = await this.vacationRepository.getAllVacations({
      page,
    })

    if (!vacations) {
      return left(null)
    }

    const count = vacations.length

    return right({
      count,
      vacations,
    })
  }
}
