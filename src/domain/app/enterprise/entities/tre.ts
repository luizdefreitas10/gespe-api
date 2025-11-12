import { Entity } from "@/core/entities/entity";
import { UniqueEntityID } from "@/core/entities/unique-entity-id";
import { Optional } from "@/core/types/optional";
import { EffectiveEnjoymentEnum, TreRequestType } from "@prisma/client";

export interface TreProps {
  userId: UniqueEntityID;
  firstTreDay?: Date | null;
  lastTreDay?: Date | null;
  treSeiNumber?: string | null;
  requestType: TreRequestType;
  yearOfAcquisition: number;
  amoutOfTreDays: number;
  observations?: string | null;
  effectiveEnjoyment: EffectiveEnjoymentEnum;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class Tre extends Entity<TreProps> {
  get userId(): UniqueEntityID {
    return this.props.userId;
  }

  get firstTreDay(): Date | null | undefined {
    return this.props.firstTreDay;
  }

  get lastTreDay(): Date | null | undefined {
    return this.props.lastTreDay;
  }

  get treSeiNumber(): string | null | undefined {
    return this.props.treSeiNumber;
  }

  get requestType(): TreRequestType {
    return this.props.requestType;
  }

  get yearOfAcquisition(): number {
    return this.props.yearOfAcquisition;
  }

  get amoutOfTreDays(): number {
    return this.props.amoutOfTreDays;
  }

  get observations(): string | null | undefined {
    return this.props.observations;
  }

  get effectiveEnjoyment(): EffectiveEnjoymentEnum {
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
    props: Optional<TreProps, "createdAt" | "updatedAt">,
    id?: UniqueEntityID
  ) {
    const tre = new Tre(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? null,
      },
      id
    );

    return tre;
  }
}
