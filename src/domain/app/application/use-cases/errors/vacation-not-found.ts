import { UseCaseError } from '@/core/errors/use-case-error'

export class VacationNotFoundError extends Error implements UseCaseError {
  constructor(identifier: string) {
    super(`Vacation ${identifier} not found.`)
  }
}
