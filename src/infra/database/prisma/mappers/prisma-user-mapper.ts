import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { User } from "@/domain/app/enterprise/entities/user";
import {
  Prisma,
  User as PrismaUser,
  Tre as PrismaTre,
  Vacation as PrismaVacation,
} from "@prisma/client";

type UserProps = PrismaUser & {
  vacation: PrismaVacation[] | [];
  tre: PrismaTre[] | [];
};

export class PrismaUserMapper {
  static toDomain(rawUser: UserProps): User {
    return User.create(
      {
        fullName: rawUser.fullName,
        email: rawUser.email,
        password: rawUser.password,
        birthDate: rawUser.birthDate,
        registry: rawUser.registry,
        position: rawUser.position,
        department: rawUser.department,
        role: rawUser.role,
        totalVacationDays: rawUser.totalVacationDays,
        totalTreDays: rawUser.totalTreDays,
        vacation: rawUser.vacation ?? [],
        tre: rawUser.tre ?? [],
        createdAt: rawUser.createdAt,
        updatedAt: rawUser.updatedAt,
      },
      new UniqueEntityID(rawUser.id)
    );
  }

  static toPersistance(user: User): Prisma.UserUncheckedCreateInput {
    return {
      id: user.id.toString(),
      fullName: user.userName,
      email: user.email,
      password: user.password,
      birthDate: user.birthDate,
      registry: user.registry ?? undefined,
      position: user.position,
      department: user.department,
      role: user.role,
      totalVacationDays: user.totalVacationDays,
      totalTreDays: user.totalTreDays,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt ?? undefined,
    };
  }
}
