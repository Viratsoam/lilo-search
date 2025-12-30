import {
  Controller,
  Get,
  Post,
  Body,
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
      from: request.from,
      searchAfter: request.searchAfter,
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
    
    // Build pagination response
    const pagination: any = {
      size: pageSize,
    };

    // If using search_after, include cursor and hasMore
    if (request.searchAfter || results.nextCursor) {
      pagination.nextCursor = results.nextCursor;
      pagination.hasMore = results.nextCursor !== undefined;
    } else {
      // Fallback to from-based pagination
      const from = request.from || 0;
      pagination.from = from;
      pagination.totalPages = Math.ceil(totalValue / pageSize);
    }

    return {
      query: request.query,
      total: {
        value: totalValue,
        relation: totalRelation as 'eq' | 'gte',
      },
      results: results.results,
      took: results.took,
      pagination,
    };
  }

  /**
   * POST /search/suggestions
   * Get search suggestions using JSON body format
   * 
   * @example
   * POST /search/suggestions
   * Content-Type: application/json
   * {
   *   "query": "glov",
   *   "size": 5
   * }
   */
  @Post('suggestions')
  @HttpCode(HttpStatus.OK)
  async getSuggestions(@Body(ValidationPipe) request: { query: string; size?: number }) {
    return this.searchService.getSuggestions(request.query || '', request.size);
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

