import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ValidationPipe,
  Logger,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchRequestDto } from './dto/search-request.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { FeatureFlagsService } from '../utils/feature-flags.service';

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  /**
   * POST /search
   * Main search endpoint using JSON body format (recommended for scalability)
   * 
   * This endpoint accepts a JSON body with search parameters, making it easy to:
   * - Add new filter types without breaking changes
   * - Support complex query structures
   * - Maintain type safety
   * - Scale for future enhancements
   * 
   * @example
   * POST /search
   * Content-Type: application/json
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
  @Post()
  @HttpCode(HttpStatus.OK)
  async search(@Body(ValidationPipe) request: SearchRequestDto): Promise<SearchResponseDto> {
    // Check global search feature flag
    if (!this.featureFlags.isSearchEnabled()) {
      this.logger.warn('Search request rejected: Search functionality is disabled via feature flag');
      throw new ServiceUnavailableException({
        message: 'Search functionality is currently disabled',
        code: 'SEARCH_DISABLED',
      });
    }

    this.logger.log(`Search query: ${request.query}${request.userId ? ` (user: ${request.userId})` : ''}`);
    
    // Handle feature flags from request (override environment defaults)
    const featureFlags = request.featureFlags || {};
    
    // Support legacy useHybridSearch parameter
    let effectiveHybridSearch: boolean | undefined = request.useHybridSearch;
    if (featureFlags.searchStrategy) {
      // If searchStrategy is set, derive hybrid search from it
      effectiveHybridSearch = featureFlags.searchStrategy === 'hybrid';
    } else if (effectiveHybridSearch === undefined && request.useHybridSearch === undefined) {
      // Default to environment setting
      effectiveHybridSearch = this.featureFlags.isHybridSearchEnabled();
    }
    
    const results = await this.searchService.search(request.query, {
      userId: request.userId,
      userType: request.userType,
      filters: request.filters || {},
      size: request.size || 20,
      from: request.from || 0,
      useHybridSearch: effectiveHybridSearch,
      featureFlags: {
        searchStrategy: featureFlags.searchStrategy,
        hybridSearchEnabled: featureFlags.hybridSearchEnabled,
        personalizationEnabled: featureFlags.personalizationEnabled,
        fuzzyMatchingEnabled: featureFlags.fuzzyMatchingEnabled,
        synonymExpansionEnabled: featureFlags.synonymExpansionEnabled,
      },
    });

    // Calculate pagination info
    const totalValue = typeof results.total === 'object' ? results.total.value : results.total || 0;
    const totalRelation = typeof results.total === 'object' ? results.total.relation : 'eq';
    const pageSize = request.size || 20;
    const totalPages = Math.ceil(totalValue / pageSize);

    return {
      query: request.query,
      total: {
        value: totalValue,
        relation: totalRelation as 'eq' | 'gte',
      },
      results: results.results,
      took: results.took,
      pagination: {
        from: request.from || 0,
        size: pageSize,
        totalPages,
      },
    };
  }

  /**
   * GET /search (Legacy endpoint - kept for backward compatibility)
   * @deprecated Use POST /search with JSON body instead. This endpoint will be removed in a future version.
   */
  @Get()
  async searchLegacy(
    @Query('q') query: string,
    @Query('userId') userId?: string,
    @Query('userType') userType?: string,
    @Query('category') category?: string,
    @Query('vendor') vendor?: string,
    @Query('region') region?: string,
    @Query('minRating') minRating?: string,
    @Query('inventoryStatus') inventoryStatus?: string,
    @Query('size') size?: string,
    @Query('from') from?: string,
    @Query('useHybridSearch') useHybridSearch?: string,
  ) {
    this.logger.warn('Using legacy GET endpoint. Please migrate to POST /search with JSON body.');
    
    const results = await this.searchService.search(query || '', {
      userId,
      userType,
      filters: {
        category,
        vendor,
        region,
        minRating: minRating ? parseFloat(minRating) : undefined,
        inventoryStatus,
      },
      size: size ? parseInt(size, 10) : 20,
      from: from ? parseInt(from, 10) : 0,
      useHybridSearch: useHybridSearch !== 'false',
    });

    return {
      query: query || '',
      ...results,
    };
  }

  @Get('suggestions')
  async getSuggestions(@Query('q') query: string) {
    return this.searchService.getSuggestions(query || '');
  }

  @Get('product/:id')
  async getProduct(@Param('id') id: string) {
    return this.searchService.getProductById(id);
  }

  @Get('stats')
  async getStats() {
    return this.searchService.getStats();
  }
}

