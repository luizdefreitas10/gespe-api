import { UseCaseError } from '@/core/errors/use-case-error'

export class TreNotFoundError extends Error implements UseCaseError {
  constructor(identifier: string) {
    super(`Tre ${identifier} not found.`)
  }
}
