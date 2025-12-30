import { IsString, IsOptional, IsNumber, Min, IsBoolean, ValidateNested, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SearchFiltersDto } from './search-filters.dto';
import { FeatureFlagsDto } from './feature-flags.dto';

/**
 * Search Request DTO
 * 
 * Main schema for product search requests using JSON body format.
 * 
 * This schema is designed to be scalable for future enhancements:
 * - Easy to add new filter types
 * - Supports complex query structures
 * - Validates input data
 * - Type-safe with TypeScript
 * 
 * @example
 * {
 *   "query": "nitrile gloves",
 *   "userId": "user_136",
 *   "filters": {
 *     "category": "Safety > Gloves",
 *     "minRating": 4.0,
 *     "inventoryStatus": "in_stock"
 *   },
 *   "size": 20,
 *   "from": 0,
 *   "useHybridSearch": true
 * }
 */
export class SearchRequestDto {
  /** Search query string (required) */
  @IsString()
  query: string;

  /** User ID for personalization (optional) */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Explicit user type for personalization (optional) */
  @IsOptional()
  @IsString()
  userType?: string;

  /** Search filters (optional) */
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  /** Number of results to return (1-100, default: 20) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number;

  /** Number of results to skip for pagination (default: 0) - DEPRECATED: Use searchAfter for better performance */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  from?: number;

  /** Cursor for pagination using search_after (recommended for deep pagination) */
  @IsOptional()
  searchAfter?: (string | number)[];

  /** Enable hybrid search - keyword + semantic (default: true) - DEPRECATED: Use featureFlags.searchStrategy instead */
  @IsOptional()
  @IsBoolean()
  useHybridSearch?: boolean;

  /** Feature flags override for this request (optional) */
  @IsOptional()
  @ValidateNested()
  @Type(() => FeatureFlagsDto)
  featureFlags?: FeatureFlagsDto;
}

