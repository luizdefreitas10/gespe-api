import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Optional } from '@/core/types/optional'
import { VerificationTokenType } from '@prisma/client'

export interface VerificationTokenProps {
  createAt: Date
  updatedAt?: Date | null
  userId: UniqueEntityID
  token: string
  type: VerificationTokenType
}

export class VerificationToken extends Entity<VerificationTokenProps> {
  get type() {
    return this.props.type
  }

  get createAt() {
    return this.props.createAt
  }

  get updatedAt() {
    return this.props.updatedAt
  }

  get userId() {
    return this.props.userId
  }

  get token() {
    return this.props.token
  }

  static create(
    props: Optional<VerificationTokenProps, 'createAt' | 'type'>,
    id?: UniqueEntityID,
  ) {
    const verificationToken = new VerificationToken(
      {
        ...props,
        type: props.type ?? 'RESET_PASSWORD',
        createAt: props.createAt ?? new Date(),
      },
      id,
    )

    return verificationToken
  }
}
