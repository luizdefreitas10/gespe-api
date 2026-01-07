import { UseCaseError } from '@/core/errors/use-case-error'

export class UserNotFoundError extends Error implements UseCaseError {
  constructor() {
    super(`Não foi encontrado registro de usuário pra esse id.`)
  }
}
