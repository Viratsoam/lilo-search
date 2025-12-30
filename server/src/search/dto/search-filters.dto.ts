import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Search Filters DTO
 * Defines all available filter options for product search
 * 
 * This schema is designed to be easily extensible - add new filter types here
 */
export class SearchFiltersDto {
  /** Filter by category (supports hierarchy with > separator) */
  @IsOptional()
  @IsString()
  category?: string;

  /** Filter by vendor name */
  @IsOptional()
  @IsString()
  vendor?: string;

  /** Filter by region availability (ISO country code: BR, MX, ES, US, CA, etc.) */
  @IsOptional()
  @IsString()
  region?: string;

  /** Minimum supplier rating (0.0 to 5.0) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  /** Filter by inventory status */
  @IsOptional()
  @IsString()
  inventoryStatus?: string;
}

