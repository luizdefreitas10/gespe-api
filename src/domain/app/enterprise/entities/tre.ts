import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Optional } from '@/core/types/optional'
import { EffectiveEnjoymentEnum, TreRequestType } from '@prisma/client'

export interface TreProps {
  userId: UniqueEntityID
  firstTreDay?: Date | null
  lastTreDay?: Date | null
  treSeiNumber?: string | null
  requestType: TreRequestType
  yearOfAcquisition: number
  amoutOfTreDays: number
  observations?: string | null
  effectiveEnjoyment?: EffectiveEnjoymentEnum | undefined
  createdAt: Date
  updatedAt?: Date | null
}

export class Tre extends Entity<TreProps> {
  get userId(): UniqueEntityID {
    return this.props.userId
  }

  get firstTreDay(): Date | null | undefined {
    return this.props.firstTreDay
  }

  set firstTreDay(value: Date | null | undefined) {
    this.props.firstTreDay = value
  }

  get lastTreDay(): Date | null | undefined {
    return this.props.lastTreDay
  }

  set lastTreDay(value: Date | null | undefined) {
    this.props.lastTreDay = value
  }

  get treSeiNumber(): string | null | undefined {
    return this.props.treSeiNumber
  }

  set treSeiNumber(value: string | null | undefined) {
    this.props.treSeiNumber = value
  }

  get requestType(): TreRequestType {
    return this.props.requestType
  }

  set requestType(value: TreRequestType) {
    this.props.requestType = value
  }

  get yearOfAcquisition(): number {
    return this.props.yearOfAcquisition
  }

  set yearOfAcquisition(value: number) {
    this.props.yearOfAcquisition = value
  }

  get amoutOfTreDays(): number {
    return this.props.amoutOfTreDays
  }

  set amoutOfTreDays(value: number) {
    this.props.amoutOfTreDays = value
  }

  get observations(): string | null | undefined {
    return this.props.observations
  }

  set observations(value: string | null | undefined) {
    this.props.observations = value
  }

  get effectiveEnjoyment(): EffectiveEnjoymentEnum | undefined {
    return this.props.effectiveEnjoyment
  }

  set effectiveEnjoyment(value: EffectiveEnjoymentEnum) {
    this.props.effectiveEnjoyment = value
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }

  set updatedAt(value: Date | null | undefined) {
    this.props.updatedAt = value
  }

  static create(
    props: Optional<TreProps, 'createdAt' | 'updatedAt'>,
    id?: UniqueEntityID,
  ) {
    const tre = new Tre(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? null,
      },
      id,
    )

    return tre
  }
}
