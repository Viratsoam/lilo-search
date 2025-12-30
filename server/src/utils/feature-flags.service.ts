import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Search Strategy Types
 */
export enum SearchStrategy {
  KEYWORD_ONLY = 'keyword_only',
  HYBRID = 'hybrid',
  SEMANTIC_ONLY = 'semantic_only',
}

/**
 * Feature Flags Service
 * 
 * Manages feature flags for search functionality.
 * All flags are driven by environment variables for easy configuration.
 * 
 * Environment Variables:
 * - SEARCH_ENABLED: Enable/disable search functionality (default: true)
 * - SEARCH_STRATEGY: Active search strategy (keyword_only|hybrid|semantic_only, default: hybrid)
 * - HYBRID_SEARCH_ENABLED: Enable hybrid search (default: true)
 * - PERSONALIZATION_ENABLED: Enable personalization features (default: true)
 * - FUZZY_MATCHING_ENABLED: Enable fuzzy matching (default: true)
 * - SYNONYM_EXPANSION_ENABLED: Enable synonym expansion (default: true)
 */
@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);

  // Global search flag
  private readonly searchEnabled: boolean;
  
  // Search strategy
  private readonly searchStrategy: SearchStrategy;
  
  // Individual feature flags
  private readonly hybridSearchEnabled: boolean;
  private readonly personalizationEnabled: boolean;
  private readonly fuzzyMatchingEnabled: boolean;
  private readonly synonymExpansionEnabled: boolean;

  constructor(private configService: ConfigService) {
    // Global search enable/disable
    this.searchEnabled = this.parseBoolean(
      this.configService.get<string>('SEARCH_ENABLED'),
      true, // Default: enabled
    );

    // Search strategy
    const strategy = this.configService.get<string>('SEARCH_STRATEGY', 'hybrid').toLowerCase();
    this.searchStrategy = this.parseSearchStrategy(strategy);

    // Individual feature flags
    this.hybridSearchEnabled = this.parseBoolean(
      this.configService.get<string>('HYBRID_SEARCH_ENABLED'),
      true, // Default: enabled
    );

    this.personalizationEnabled = this.parseBoolean(
      this.configService.get<string>('PERSONALIZATION_ENABLED'),
      true, // Default: enabled
    );

    this.fuzzyMatchingEnabled = this.parseBoolean(
      this.configService.get<string>('FUZZY_MATCHING_ENABLED'),
      true, // Default: enabled
    );

    this.synonymExpansionEnabled = this.parseBoolean(
      this.configService.get<string>('SYNONYM_EXPANSION_ENABLED'),
      true, // Default: enabled
    );
  }

  async onModuleInit() {
    this.logger.log('🔧 Feature Flags Initialized:');
    this.logger.log(`   Search Enabled: ${this.searchEnabled}`);
    this.logger.log(`   Search Strategy: ${this.searchStrategy}`);
    this.logger.log(`   Hybrid Search: ${this.hybridSearchEnabled}`);
    this.logger.log(`   Personalization: ${this.personalizationEnabled}`);
    this.logger.log(`   Fuzzy Matching: ${this.fuzzyMatchingEnabled}`);
    this.logger.log(`   Synonym Expansion: ${this.synonymExpansionEnabled}`);

    if (!this.searchEnabled) {
      this.logger.warn('⚠️  Search functionality is DISABLED via feature flag');
    }
  }

  /**
   * Check if search functionality is globally enabled
   */
  isSearchEnabled(): boolean {
    return this.searchEnabled;
  }

  /**
   * Get the active search strategy
   */
  getSearchStrategy(): SearchStrategy {
    return this.searchStrategy;
  }

  /**
   * Check if hybrid search is enabled
   * Hybrid search combines keyword + semantic search
   */
  isHybridSearchEnabled(): boolean {
    return this.hybridSearchEnabled && this.searchStrategy === SearchStrategy.HYBRID;
  }

  /**
   * Check if semantic-only search is enabled
   */
  isSemanticOnlyEnabled(): boolean {
    return this.searchStrategy === SearchStrategy.SEMANTIC_ONLY;
  }

  /**
   * Check if keyword-only search is enabled
   */
  isKeywordOnlyEnabled(): boolean {
    return this.searchStrategy === SearchStrategy.KEYWORD_ONLY;
  }

  /**
   * Check if personalization is enabled
   */
  isPersonalizationEnabled(): boolean {
    return this.personalizationEnabled && this.searchEnabled;
  }

  /**
   * Check if fuzzy matching is enabled
   */
  isFuzzyMatchingEnabled(): boolean {
    return this.fuzzyMatchingEnabled && this.searchEnabled;
  }

  /**
   * Check if synonym expansion is enabled
   */
  isSynonymExpansionEnabled(): boolean {
    return this.synonymExpansionEnabled && this.searchEnabled;
  }

  /**
   * Get all feature flags status (for debugging/monitoring)
   */
  getFeatureFlagsStatus() {
    return {
      searchEnabled: this.searchEnabled,
      searchStrategy: this.searchStrategy,
      hybridSearchEnabled: this.isHybridSearchEnabled(),
      personalizationEnabled: this.isPersonalizationEnabled(),
      fuzzyMatchingEnabled: this.isFuzzyMatchingEnabled(),
      synonymExpansionEnabled: this.isSynonymExpansionEnabled(),
    };
  }

  /**
   * Get feature flags with runtime overrides
   * Request-level flags override environment flags
   */
  getFeatureFlagsWithOverrides(overrides?: {
    searchStrategy?: SearchStrategy;
    hybridSearchEnabled?: boolean;
    personalizationEnabled?: boolean;
    fuzzyMatchingEnabled?: boolean;
    synonymExpansionEnabled?: boolean;
  }) {
    const effectiveStrategy = overrides?.searchStrategy ?? this.searchStrategy;
    const effectiveHybrid = overrides?.hybridSearchEnabled ?? this.hybridSearchEnabled;
    const effectivePersonalization = overrides?.personalizationEnabled ?? this.personalizationEnabled;
    const effectiveFuzzy = overrides?.fuzzyMatchingEnabled ?? this.fuzzyMatchingEnabled;
    const effectiveSynonym = overrides?.synonymExpansionEnabled ?? this.synonymExpansionEnabled;

    return {
      searchEnabled: this.searchEnabled, // Global flag cannot be overridden
      searchStrategy: effectiveStrategy,
      hybridSearchEnabled: effectiveHybrid && effectiveStrategy === SearchStrategy.HYBRID,
      personalizationEnabled: effectivePersonalization && this.searchEnabled,
      fuzzyMatchingEnabled: effectiveFuzzy && this.searchEnabled,
      synonymExpansionEnabled: effectiveSynonym && this.searchEnabled,
    };
  }

  /**
   * Check if hybrid search is enabled with overrides
   */
  isHybridSearchEnabledWithOverride(
    override?: boolean,
    strategyOverride?: SearchStrategy,
  ): boolean {
    const strategy = strategyOverride ?? this.searchStrategy;
    const hybridEnabled = override ?? this.hybridSearchEnabled;
    return hybridEnabled && strategy === SearchStrategy.HYBRID;
  }

  /**
   * Check if personalization is enabled with override
   */
  isPersonalizationEnabledWithOverride(override?: boolean): boolean {
    const personalizationEnabled = override ?? this.personalizationEnabled;
    return personalizationEnabled && this.searchEnabled;
  }

  /**
   * Check if fuzzy matching is enabled with override
   */
  isFuzzyMatchingEnabledWithOverride(override?: boolean): boolean {
    const fuzzyEnabled = override ?? this.fuzzyMatchingEnabled;
    return fuzzyEnabled && this.searchEnabled;
  }

  /**
   * Parse boolean from environment variable
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
  }

  /**
   * Parse search strategy from environment variable
   */
  private parseSearchStrategy(value: string): SearchStrategy {
    const lower = value.toLowerCase().trim();
    switch (lower) {
      case 'keyword_only':
      case 'keyword':
        return SearchStrategy.KEYWORD_ONLY;
      case 'semantic_only':
      case 'semantic':
        return SearchStrategy.SEMANTIC_ONLY;
      case 'hybrid':
      default:
        return SearchStrategy.HYBRID;
    }
  }
}

