import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { SearchStrategy } from '../../utils/feature-flags.service';

/**
 * Feature Flags DTO
 * 
 * Allows clients to override feature flags per request.
 * These flags override environment variable defaults for this specific request.
 * 
 * @example
 * {
 *   "searchStrategy": "hybrid",
 *   "hybridSearchEnabled": true,
 *   "personalizationEnabled": true,
 *   "fuzzyMatchingEnabled": true
 * }
 */
export class FeatureFlagsDto {
  /** Override search strategy for this request */
  @IsOptional()
  @IsEnum(SearchStrategy)
  searchStrategy?: SearchStrategy;

  /** Override hybrid search flag for this request */
  @IsOptional()
  @IsBoolean()
  hybridSearchEnabled?: boolean;

  /** Override personalization flag for this request */
  @IsOptional()
  @IsBoolean()
  personalizationEnabled?: boolean;

  /** Override fuzzy matching flag for this request */
  @IsOptional()
  @IsBoolean()
  fuzzyMatchingEnabled?: boolean;

  /** Override synonym expansion flag for this request */
  @IsOptional()
  @IsBoolean()
  synonymExpansionEnabled?: boolean;
}

