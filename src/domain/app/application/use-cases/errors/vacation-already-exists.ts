import { UseCaseError } from "@/core/errors/use-case-error";

export class VacationAlreadyExistsError extends Error implements UseCaseError {
  constructor(identifier: string) {
    super(`Vacation ${identifier} already exists.`);
  }
}
