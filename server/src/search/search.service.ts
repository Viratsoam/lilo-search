import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { EmbeddingService } from '../utils/embedding.service';
import { UserTypeService } from '../utils/user-type.service';
import { UserProfileService } from '../utils/user-profile.service';
import { FeatureFlagsService, SearchStrategy } from '../utils/feature-flags.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly INDEX_NAME = 'products';
  private userOrderHistory: Map<string, Set<string>> = new Map();

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly embeddingService: EmbeddingService,
    private readonly userTypeService: UserTypeService,
    private readonly userProfileService: UserProfileService,
    private readonly featureFlags: FeatureFlagsService,
  ) {
    this.loadUserOrderHistory();
  }

  private loadUserOrderHistory() {
    try {
      // Try multiple paths for development and production
      const possiblePaths = [
        path.join(__dirname, '../data/orders.json'),
        path.join(process.cwd(), 'src/data/orders.json'),
        path.join(process.cwd(), 'server/src/data/orders.json'),
      ];

      let ordersPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          ordersPath = p;
          break;
        }
      }

      if (!ordersPath) {
        this.logger.warn('Orders file not found, personalization disabled');
        return;
      }

      const orders: any[] = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));

      orders.forEach((order) => {
        const userId = order.user_id;
        if (!this.userOrderHistory.has(userId)) {
          this.userOrderHistory.set(userId, new Set());
        }

        order.cart?.items?.forEach((item: any) => {
          if (item.product_id) {
            this.userOrderHistory.get(userId)?.add(item.product_id);
          }
        });
      });

      this.logger.log(
        `📊 Loaded order history for ${this.userOrderHistory.size} users`,
      );
    } catch (error) {
      this.logger.warn('Failed to load order history', error);
    }
  }

  async search(
    query: string,
    options: {
      userId?: string;
      userType?: string; // Allow explicit user type
      filters?: {
        category?: string;
        vendor?: string;
        region?: string;
        minRating?: number;
        inventoryStatus?: string;
      };
      size?: number;
      from?: number;
      searchAfter?: (string | number)[]; // Cursor for search_after pagination
      useHybridSearch?: boolean; // Legacy parameter
      featureFlags?: {
        searchStrategy?: SearchStrategy;
        hybridSearchEnabled?: boolean;
        personalizationEnabled?: boolean;
        fuzzyMatchingEnabled?: boolean;
        synonymExpansionEnabled?: boolean;
      };
    } = {},
  ) {
    const {
      userId,
      userType: explicitUserType,
      filters = {},
      size = 20,
      from = 0,
      searchAfter,
      useHybridSearch: requestHybridSearch,
      featureFlags: requestFeatureFlags,
    } = options;

    // Get effective feature flags (request overrides environment)
    const effectiveFlags = this.featureFlags.getFeatureFlagsWithOverrides(
      requestFeatureFlags,
    );

    // Determine search strategy based on feature flags (request overrides environment)
    const searchStrategy = requestFeatureFlags?.searchStrategy ?? this.featureFlags.getSearchStrategy();
    const shouldUseHybridSearch = this.determineSearchStrategyWithFlags(
      requestHybridSearch,
      searchStrategy,
      effectiveFlags,
    );

    // Generate query embedding based on feature flags and strategy
    let queryEmbedding: number[] | null = null;
    if (shouldUseHybridSearch && effectiveFlags.hybridSearchEnabled) {
      if (this.embeddingService.isEnabled()) {
        // BGE models work better with "query: " prefix for search queries
        const queryText = this.embeddingService.prepareQueryText(query);
        queryEmbedding = await this.embeddingService.generateEmbedding(queryText);
      } else {
        this.logger.warn('Hybrid search requested but embeddings are not available');
      }
    } else if (searchStrategy === SearchStrategy.SEMANTIC_ONLY) {
      // Semantic-only mode
      if (this.embeddingService.isEnabled()) {
        const queryText = this.embeddingService.prepareQueryText(query);
        queryEmbedding = await this.embeddingService.generateEmbedding(queryText);
      } else {
        this.logger.warn('Semantic-only search requested but embeddings are not available, falling back to keyword');
      }
    }

    // Determine user type (explicit or inferred from userId)
    const effectiveUserType = explicitUserType || (userId ? this.userTypeService.getUserType(userId) : null);

    // Build the search query with effective feature flags
    const searchQueryBody = this.buildSearchQuery(
      query,
      queryEmbedding,
      filters,
      userId,
      effectiveUserType,
      effectiveFlags,
    );

    // Build complete search query with sorting for search_after pagination
    // Sort by score descending, then by title.keyword for stability
    // Note: _id cannot be used for sorting without enabling fielddata
    const searchQuery: any = {
      ...searchQueryBody,
      sort: [
        { _score: { order: 'desc' } },
        { 'title.keyword': { order: 'asc', missing: '_last' } },
      ],
    };

    try {
      // Log query structure for debugging (remove in production)
      if (userId) {
        this.logger.debug('Personalization query:', JSON.stringify(searchQuery, null, 2));
      }
      
      // Build search parameters
      const searchParams: any = {
        index: this.INDEX_NAME,
        body: searchQuery,
        size,
      };

      // Use search_after if provided, otherwise fall back to from
      if (searchAfter && searchAfter.length > 0) {
        searchParams.body.search_after = searchAfter;
        this.logger.debug(`Using search_after pagination: ${JSON.stringify(searchAfter)}`);
      } else if (from > 0) {
        searchParams.from = from;
        this.logger.debug(`Using from pagination: ${from}`);
      }

      const response = await this.elasticsearchService.client.search(searchParams);

      // Extract sort values from last hit for next page cursor
      const hits = response.hits.hits;
      const nextCursor = hits.length > 0 && hits.length === size
        ? hits[hits.length - 1].sort
        : undefined;

      return {
        total: response.hits.total,
        results: hits.map((hit: any) => ({
          ...hit._source,
          score: hit._score,
          id: hit._id,
        })),
        took: response.took,
        nextCursor, // Cursor for next page
      };
    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  private buildSearchQuery(
    query: string,
    queryEmbedding: number[] | null,
    filters: any,
    userId?: string,
    userType?: string | null,
    featureFlags?: {
      searchEnabled: boolean;
      searchStrategy: SearchStrategy;
      hybridSearchEnabled: boolean;
      personalizationEnabled: boolean;
      fuzzyMatchingEnabled: boolean;
      synonymExpansionEnabled: boolean;
    },
  ) {
    // Use effective feature flags or fall back to environment defaults
    const effectiveFlags = featureFlags ?? this.featureFlags.getFeatureFlagsStatus();
    
    const mustClauses: any[] = [];
    const shouldClauses: any[] = [];
    const filterClauses: any[] = [];

    // Main query: multi-match with optional fuzzy matching
    if (query && query.trim()) {
      const fuzzyConfig = effectiveFlags.fuzzyMatchingEnabled
        ? { fuzziness: 'AUTO' as const }
        : {};

      mustClauses.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'title^3', // Boost title matches
            'description^1.5',
            'vendor^1',
            'searchable_text^1',
            'category^2',
          ],
          type: 'best_fields',
          ...fuzzyConfig, // Include fuzziness only if enabled
          operator: 'or',
        },
      });

      // Add exact phrase match boost
      shouldClauses.push({
        match_phrase: {
          title: {
            query: query.trim(),
            boost: 5.0,
          },
        },
      });

      // Add fuzzy match for typos (only if enabled)
      if (effectiveFlags.fuzzyMatchingEnabled) {
        shouldClauses.push({
          match: {
            title: {
              query: query.trim(),
              fuzziness: 2,
              boost: 2.0,
            },
          },
        });
      }
    }

    // Hybrid search: combine keyword with vector search
    if (queryEmbedding) {
      shouldClauses.push({
        script_score: {
          query: { match_all: {} },
          script: {
            source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
            params: {
              query_vector: queryEmbedding,
            },
          },
          boost: 1.5, // Boost semantic matches
        },
      });
    }

    // ===== COMPREHENSIVE PERSONALIZATION =====
    // Use UserProfileService for multi-factor personalization
    // Only apply if personalization is enabled via feature flag
    
    if (userId && effectiveFlags.personalizationEnabled) {
      const userProfile = this.userProfileService.getUserProfile(userId);
      if (userProfile) {
        // 1. User Type: Boost preferred categories (2.5x)
        if (userProfile.preferredCategories.length > 0) {
          userProfile.preferredCategories.forEach((category) => {
            shouldClauses.push({
              constant_score: {
                filter: {
                  match: {
                    category: category,
                  },
                },
                boost: 2.5,
              },
            });
          });
        }

        // 2. Preferred Vendors (1.8x)
        if (userProfile.preferredVendors.length > 0) {
          userProfile.preferredVendors.forEach((vendor) => {
            shouldClauses.push({
              constant_score: {
                filter: {
                  term: {
                    'vendor.keyword': vendor,
                  },
                },
                boost: 1.8,
              },
            });
          });
        }

        // 3. Region Preferences (1.5x)
        if (userProfile.regionPreferences.length > 0) {
          userProfile.regionPreferences.forEach((region) => {
            shouldClauses.push({
              constant_score: {
                filter: {
                  term: {
                    region_availability: region,
                  },
                },
                boost: 1.5,
              },
            });
          });
        }

        // 4. Quality Focus: Boost high-rated products (1.3x)
        if (userProfile.qualityFocused) {
          shouldClauses.push({
            constant_score: {
              filter: {
                range: {
                  supplier_rating: {
                    gte: 4.0,
                  },
                },
              },
              boost: 1.3,
            },
          });
        }

        // 5. Inventory Preference: Boost in-stock items (1.2x)
        if (userProfile.prefersInStock) {
          shouldClauses.push({
            constant_score: {
              filter: {
                term: {
                  inventory_status: 'in_stock',
                },
              },
              boost: 1.2,
            },
          });
        }

        // 6. Price Segment: Boost products in user's price range
        if (userProfile.priceSegment === 'premium') {
          // Boost higher-priced items (if we had price field)
          // For now, we can boost by rating as proxy
          shouldClauses.push({
            constant_score: {
              filter: {
                range: {
                  supplier_rating: {
                    gte: 4.2,
                  },
                },
              },
              boost: 1.1,
            },
          });
        }

        this.logger.debug(
          `Personalizing for user ${userId}: ${userProfile.userType}, ${userProfile.orderFrequency}, quality=${userProfile.qualityFocused}`,
        );
      }
    }

    // 7. User Type-based personalization (if explicit userType provided and personalization enabled)
    if (userType && !userId && effectiveFlags.personalizationEnabled) {
      const profile = this.userTypeService.getUserTypeProfile(userType);
      if (profile) {
        if (profile.preferredCategories.length > 0) {
          profile.preferredCategories.forEach((category) => {
            shouldClauses.push({
              constant_score: {
                filter: {
                  match: {
                    category: category,
                  },
                },
                boost: 2.5,
              },
            });
          });
        }

        if (profile.preferredVendors.length > 0) {
          profile.preferredVendors.forEach((vendor) => {
            shouldClauses.push({
              constant_score: {
                filter: {
                  term: {
                    'vendor.keyword': vendor,
                  },
                },
                boost: 1.8,
              },
            });
          });
        }
      }
    }

    // 8. Order History: Strongest boost for previously ordered products (3.0x)
    if (userId && this.userOrderHistory.has(userId)) {
      const userProducts = Array.from(
        this.userOrderHistory.get(userId) || [],
      );
      if (userProducts.length > 0) {
        shouldClauses.push({
          constant_score: {
            filter: {
              terms: {
                _id: userProducts,
              },
            },
            boost: 3.0, // Strongest boost
          },
        });
      }
    }

    // Additional boosting for high-rated and in-stock items (applies to all searches)
    shouldClauses.push({
      constant_score: {
        filter: {
          range: {
            supplier_rating: {
              gte: 4.0,
            },
          },
        },
        boost: 1.2, // Boost high-rated suppliers
      },
    });

    shouldClauses.push({
      constant_score: {
        filter: {
          term: {
            inventory_status: 'in_stock',
          },
        },
        boost: 1.1, // Boost in-stock items
      },
    });

    // Filters
    if (filters.category) {
      filterClauses.push({
        match: {
          category: filters.category,
        },
      });
    }

    if (filters.vendor) {
      filterClauses.push({
        term: {
          'vendor.keyword': filters.vendor,
        },
      });
    }

    if (filters.region) {
      filterClauses.push({
        term: {
          region_availability: filters.region,
        },
      });
    }

    if (filters.minRating !== undefined) {
      filterClauses.push({
        range: {
          supplier_rating: {
            gte: filters.minRating,
          },
        },
      });
    }

    if (filters.inventoryStatus) {
      filterClauses.push({
        term: {
          inventory_status: filters.inventoryStatus,
        },
      });
    }

    // Additional boosting for high-rated and in-stock items (applies to all searches)
    shouldClauses.push({
      constant_score: {
        filter: {
          range: {
            supplier_rating: {
              gte: 4.0,
            },
          },
        },
        boost: 1.2, // Boost high-rated suppliers
      },
    });

    shouldClauses.push({
      constant_score: {
        filter: {
          term: {
            inventory_status: 'in_stock',
          },
        },
        boost: 1.1, // Boost in-stock items
      },
    });

    // Build final bool query
    const boolQuery: any = {};

    if (mustClauses.length > 0) {
      boolQuery.must = mustClauses;
    }

    if (shouldClauses.length > 0) {
      boolQuery.should = shouldClauses;
      // Set minimum_should_match to 0 so should clauses are optional boosts
      boolQuery.minimum_should_match = query ? 1 : 0;
    }

    if (filterClauses.length > 0) {
      boolQuery.filter = filterClauses;
    }

    // Ensure bool query has at least one clause
    if (Object.keys(boolQuery).length === 0) {
      boolQuery.must = [{ match_all: {} }];
    }

    return {
      query: {
        bool: boolQuery,
      },
    };
  }

  /**
   * Determine search strategy based on feature flags and request parameter
   */
  private determineSearchStrategyWithFlags(
    requestHybridSearch: boolean | undefined,
    featureFlagStrategy: SearchStrategy,
    effectiveFlags: {
      searchEnabled: boolean;
      searchStrategy: SearchStrategy;
      hybridSearchEnabled: boolean;
      personalizationEnabled: boolean;
      fuzzyMatchingEnabled: boolean;
      synonymExpansionEnabled: boolean;
    },
  ): boolean {
    // If request explicitly sets useHybridSearch, respect it (if allowed by feature flag)
    if (requestHybridSearch !== undefined) {
      return requestHybridSearch && effectiveFlags.hybridSearchEnabled;
    }

    // Otherwise, use feature flag strategy
    return featureFlagStrategy === SearchStrategy.HYBRID && effectiveFlags.hybridSearchEnabled;
  }

  async getProductById(productId: string) {
    try {
      const response = await this.elasticsearchService.client.get({
        index: this.INDEX_NAME,
        id: productId,
      });

      return response._source;
    } catch (error) {
      this.logger.error(`Failed to get product ${productId}`, error);
      return null;
    }
  }

  async getSuggestions(query: string, size = 5) {
    try {
      const response = await this.elasticsearchService.client.search({
        index: this.INDEX_NAME,
        body: {
          query: {
            multi_match: {
              query,
              fields: ['title^2', 'category', 'vendor'],
              type: 'phrase_prefix',
              fuzziness: 'AUTO',
            },
          },
          size,
        },
      });

      return response.hits.hits.map((hit: any) => ({
        title: hit._source.title,
        category: hit._source.category,
        id: hit._id,
      }));
    } catch (error) {
      this.logger.error('Failed to get suggestions', error);
      return [];
    }
  }

  async getStats() {
    try {
      const countResponse = await this.elasticsearchService.client.count({
        index: this.INDEX_NAME,
      });

      const statsResponse = await this.elasticsearchService.client.search({
        index: this.INDEX_NAME,
        body: {
          size: 0,
          aggs: {
            vendors: {
              terms: { field: 'vendor.keyword', size: 10 },
            },
            categories: {
              terms: { field: 'normalized_category', size: 20 },
            },
            inventory_status: {
              terms: { field: 'inventory_status' },
            },
            avg_rating: {
              avg: { field: 'supplier_rating' },
            },
          },
        },
      });

      return {
        totalProducts: countResponse.count,
        aggregations: statsResponse.aggregations,
      };
    } catch (error) {
      this.logger.error('Failed to get stats', error);
      throw error;
    }
  }
}

