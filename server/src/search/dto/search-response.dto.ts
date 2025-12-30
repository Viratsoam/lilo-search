/**
 * Product Search Result Item
 */
export class SearchResultItemDto {
  /** Product ID */
  id: string;

  /** Product title */
  title: string;

  /** Product description */
  description?: string;

  /** Vendor name */
  vendor?: string;

  /** Product SKU */
  sku?: string;

  /** Product category */
  category?: string;

  /** Search relevance score */
  score?: number;

  /** Supplier rating (0.0 to 5.0) */
  supplier_rating?: number;

  /** Inventory status */
  inventory_status?: string;

  /** Region availability (array of ISO country codes) */
  region_availability?: string[];
}

/**
 * Search Response DTO
 * Standard response format for search requests
 */
export class SearchResponseDto {
  /** Original search query */
  query: string;

  /** Total number of matching results */
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };

  /** Search results array */
  results: SearchResultItemDto[];

  /** Time taken for search in milliseconds */
  took: number;

  /** Pagination information */
  pagination?: {
    from: number;
    size: number;
    totalPages: number;
  };
}

