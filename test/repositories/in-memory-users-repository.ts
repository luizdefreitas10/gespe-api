import { PaginationParams } from '@/core/repositories/pagination-params'
import { UserRepository } from '@/domain/app/application/repositories/user-repository'
import { User } from '@/domain/app/enterprise/entities/user'

export class InMemoryUsersRepository implements UserRepository {
  public items: User[] = []

  async findById(userId: string): Promise<User | null> {
    const user = this.items.find((item) => item.id.toString() === userId)

    if (!user) {
      return null
    }

    return user
  }

  async getAllUsers({ page, size }: PaginationParams): Promise<User[]> {
    const take = size || 20
    const skip = (page - 1) * take
    return this.items.slice(skip, skip + take)
  }

  async createUser(user: User): Promise<void> {
    this.items.push(user)
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.items.find((user) => user.email === email)

    if (!user) {
      return null
    }

    return user
  }

  async updateTotalTreDays(
    userId: string,
    totalTreDays: number,
  ): Promise<void> {
    const user = this.items.find((item) => item.id.toString() === userId)
    if (!user) return

    user.totalTreDays = totalTreDays
  }
}
