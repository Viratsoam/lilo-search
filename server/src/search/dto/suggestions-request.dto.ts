import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Suggestions Request DTO
 * 
 * Request schema for search suggestions using JSON body format.
 * 
 * @example
 * {
 *   "query": "glov",
 *   "size": 5
 * }
 */
export class SuggestionsRequestDto {
  /** Search query string for suggestions (required) */
  @IsString()
  query: string;

  /** Number of suggestions to return (1-20, default: 5) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  size?: number;
}

