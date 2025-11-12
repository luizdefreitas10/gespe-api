import { Entity } from "@/core/entities/entity";
import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { Optional } from "@/core/types/optional";
import { EffectiveEnjoymentEnum, VacationRequestType } from "@prisma/client";

export interface VacationProps {
  userId: UniqueEntityID;
  firstVacationDay: Date;
  lastVacationDay: Date;
  vacationSeiNumber?: string | null;
  requestType: VacationRequestType;
  year: number;
  amoutOfVacationDays: number;
  observations?: string | null;
  effectiveEnjoyment?: EffectiveEnjoymentEnum | undefined;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class Vacation extends Entity<VacationProps> {
  get userId(): UniqueEntityID {
    return this.props.userId;
  }

  get firstVacationDay(): Date {
    return this.props.firstVacationDay;
  }

  get lastVacationDay(): Date {
    return this.props.lastVacationDay;
  }

  get vacationSeiNumber(): string | null | undefined {
    return this.props.vacationSeiNumber;
  }

  get requestType(): VacationRequestType {
    return this.props.requestType;
  }

  get year(): number {
    return this.props.year;
  }

  get amoutOfVacationDays(): number {
    return this.props.amoutOfVacationDays;
  }

  get observations(): string | null | undefined {
    return this.props.observations;
  }

  get effectiveEnjoyment(): EffectiveEnjoymentEnum | undefined {
    return this.props.effectiveEnjoyment;
  }

  set effectiveEnjoyment(value: EffectiveEnjoymentEnum) {
    this.props.effectiveEnjoyment = value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt;
  }

  static create(
    props: Optional<VacationProps, "createdAt" | "updatedAt">,
    id?: UniqueEntityID
  ) {
    const vacation = new Vacation(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? null,
      },
      id
    );

    return vacation;
  }
}
