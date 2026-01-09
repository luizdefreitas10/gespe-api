export abstract class EncrypterValidationToken {
  abstract generateEmailVerificationToken(userId: string, email: string): string
  abstract validateEmailVerificationToken(token: string): Promise<boolean>
}
