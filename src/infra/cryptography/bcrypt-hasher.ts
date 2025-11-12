import { HashComparer } from '@/domain/app/application/cryptography/hash-comparer'
import { HashGenerator } from '@/domain/app/application/cryptography/hash-generator'
import { compare, hash } from 'bcryptjs'

export class BcryptHasher implements HashComparer, HashGenerator {
  private HASH_SALT_LENGHT = 8

  hash(plainText: string): Promise<string> {
    return hash(plainText, this.HASH_SALT_LENGHT)
  }

  compare(plainText: string, hash: string): Promise<boolean> {
    return compare(plainText, hash)
  }
}
