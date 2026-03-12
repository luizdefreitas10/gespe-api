import { PaginationParams } from '@/core/repositories/pagination-params'
import { User } from '../../enterprise/entities/user'

export abstract class UserRepository {
  abstract createUser(user: User): Promise<void>
  abstract findById(userId: string): Promise<User | null>
  abstract getAllUsers({ page, size }: PaginationParams): Promise<User[]>
  abstract findByEmail(email: string): Promise<User | null>
  abstract updateTotalTreDays(
    userId: string,
    totalTreDays: number,
  ): Promise<void>

  abstract delete(user: User): Promise<void>
}
