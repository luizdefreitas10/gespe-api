import { UniqueEntityID } from '@/core/entities/unique-entity-id'
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
    return this.items
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
}
