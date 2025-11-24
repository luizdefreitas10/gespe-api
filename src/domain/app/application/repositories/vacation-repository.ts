import { PaginationParams } from "@/core/repositories/pagination-params";
import { Vacation } from "../../enterprise/entities/vacation";

export abstract class VacationRepository {
  abstract createVacation(vacation: Vacation): Promise<void>;
  abstract findById(vacationId: string): Promise<Vacation | null>;
  abstract getAllVacations({
    page,
    size,
  }: PaginationParams): Promise<Vacation[] | null>;
  abstract findByUserId(
    userId: string,
    { page, size }: PaginationParams
  ): Promise<Vacation[] | null>;
  abstract findByYear(userId: string, year: number): Promise<Vacation[] | null>;
  abstract updateVacation(vacation: Vacation): Promise<void>;
  abstract deleteVacation(vacationId: string): Promise<void>;
}
