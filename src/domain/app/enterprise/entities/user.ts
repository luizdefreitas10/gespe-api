import { Entity } from "@/core/entities/entity";
import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { Optional } from "@/core/types/optional";
import {
  Role,
  Tre as PrismaTre,
  Vacation as PrismaVacation,
  Status,
} from "@prisma/client";
import { Vacation } from "./vacation";
import { Tre } from "./tre";

export interface UserProps {
  fullName: string;
  email: string;
  password: string;
  birthDate: Date;
  registry?: string | null;
  position: string;
  department: string;
  role?: Role;
  totalVacationDays?: number;
  totalTreDays?: number;
  vacation?: Vacation[] | PrismaVacation[];
  tre?: Tre[] | PrismaTre[];
  createdAt?: Date;
  updatedAt?: Date | null;
  status?: Status;
}

export class User extends Entity<UserProps> {
  get userName(): string {
    return this.props.fullName;
  }

  get email(): string {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  set password(password: string) {
    this.props.password = password;
  }

  get birthDate() {
    return this.props.birthDate;
  }

  set birthDate(birthDate: Date) {
    this.props.birthDate = birthDate;
  }

  get registry() {
    return this.props.registry;
  }

  get position() {
    return this.props.position;
  }

  get department() {
    return this.props.department;
  }

  get role() {
    return this.props.role;
  }

  get totalVacationDays() {
    return this.props.totalVacationDays ?? 0;
  }

  set totalVacationDays(vacationDays: number) {
    this.props.totalVacationDays = vacationDays;
  }

  get totalTreDays() {
    return this.props.totalTreDays ?? 0;
  }

  set totalTreDays(treDays: number) {
    this.props.totalTreDays = treDays;
  }

  get vacation() {
    return this.props.vacation;
  }

  get tre() {
    return this.props.tre;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  get status() {
    return this.props.status;
  }

  set status(status) {
    this.props.status = status;
  }

  static create(
    props: Optional<UserProps, "updatedAt" | "tre" | "vacation">,
    id?: UniqueEntityID
  ) {
    const user = new User(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
      },
      id
    );

    return user;
  }
}
