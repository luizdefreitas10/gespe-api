import { PaginationParams } from "@/core/repositories/pagination-params";
import { Tre } from "../../enterprise/entities/tre";

export abstract class TreRepository {
  abstract createTre(tre: Tre): Promise<void>;
  abstract findById(treId: string): Promise<Tre | null>;
  abstract getAllTres({ page, size }: PaginationParams): Promise<Tre[]>;
  abstract findByUserId(userId: string): Promise<Tre[] | null>;
  abstract findByYearOfAcquisition(
    userId: string,
    year: number
  ): Promise<Tre[] | null>;
  abstract updateTre(tre: Tre): Promise<void>;
  abstract deleteTre(treId: string): Promise<void>;
}
