import { User } from '@/domain/app/enterprise/entities/user'

export class UserByIdPresenter {
  // ou static present()
  static toHTTP(user: User) {
    return {
      id: user.id.toString(),
      email: user.email,
      fullName: user.userName,
      birthDate: user.birthDate,
      registry: user.registry,
      position: user.position,
      department: user.department,
      role: user.role,
      totalVacationDays: user.totalVacationDays,
      totalTreDays: user.totalTreDays,
      vacation: user.vacation,
      tre: user.tre,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      status: user.status,
    }
  }
}
