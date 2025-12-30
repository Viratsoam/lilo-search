'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Product {
  id: string;
  title: string;
  description?: string;
  vendor?: string;
  category?: string;
  supplier_rating?: number;
  inventory_status?: string;
  unit_of_measure?: string;
  bulk_pack_size?: string;
  region_availability?: string[];
  score?: number;
}

interface SearchResponse {
  query: string;
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
  results: Product[];
  took: number;
  pagination?: {
    size: number;
    nextCursor?: (string | number)[];
    hasMore?: boolean;
    from?: number;
    totalPages?: number;
  };
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [region, setRegion] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inventoryStatus, setInventoryStatus] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<(string | number)[] | null>(null);
  const [previousCursors, setPreviousCursors] = useState<(string | number)[][]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/search/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const handleSearch = async (cursor: (string | number)[] | null = null, isNext: boolean = true) => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build request body with JSON format
      const requestBody: any = {
        query: query.trim(),
        size: 20,
      };

      // Add filters
      const filters: any = {};
      if (category) filters.category = category;
      if (vendor) filters.vendor = vendor;
      if (region) filters.region = region;
      if (minRating) filters.minRating = parseFloat(minRating);
      if (inventoryStatus) filters.inventoryStatus = inventoryStatus;

      if (Object.keys(filters).length > 0) {
        requestBody.filters = filters;
      }

      // Add user ID for personalization
      if (userId) {
        requestBody.userId = userId;
      }

      // Use search_after for pagination (recommended)
      if (cursor) {
        requestBody.searchAfter = cursor;
      }

      const response = await axios.post<SearchResponse>(`${API_URL}/search`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setResults(response.data);
      
      // Update pagination state
      const pagination = response.data.pagination;
      if (pagination?.nextCursor) {
        setNextCursor(pagination.nextCursor);
        if (isNext) {
          // Add current cursor to history for back navigation
          if (cursor) {
            setPreviousCursors((prev) => [...prev, cursor]);
          }
        }
      } else {
        setNextCursor(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
      setResults(null);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (nextCursor) {
      handleSearch(nextCursor, true);
    }
  };

  const handlePreviousPage = () => {
    if (previousCursors.length > 0) {
      const prevCursors = [...previousCursors];
      prevCursors.pop(); // Remove last cursor
      setPreviousCursors(prevCursors);
      const prevCursor = prevCursors.length > 0 ? prevCursors[prevCursors.length - 1] : null;
      handleSearch(prevCursor, false);
    } else {
      // Go back to first page
      handleSearch(null, false);
      setPreviousCursors([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPreviousCursors([]);
    setNextCursor(null);
    handleSearch(null, false);
  };

  const totalResults = results?.total?.value || 0;
  const hasMore = results?.pagination?.hasMore || false;
  const canGoBack = previousCursors.length > 0 || (results && !nextCursor);

  return (
    <div className="container">
      <div className="header">
        <h1>🔍 Lilo Search</h1>
        <p>Advanced B2B Ecommerce Search Engine</p>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalProducts?.toLocaleString() || 0}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.aggregations?.avg_rating?.value?.toFixed(1) || 'N/A'}
            </div>
            <div className="stat-label">Avg Rating</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.aggregations?.inventory_status?.buckets?.find(
                (b: any) => b.key === 'in_stock',
              )?.doc_count || 0}
            </div>
            <div className="stat-label">In Stock</div>
          </div>
        </div>
      )}

      <div className="search-container">
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            className="search-input"
            placeholder="Search products... (e.g., nitrile gloves, 3 hp pump, tomato)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="filters">
          <input
            type="text"
            className="filter-input"
            placeholder="User ID (for personalization)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ flex: '1', minWidth: '200px' }}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ flex: '1', minWidth: '150px' }}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="Vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            style={{ flex: '1', minWidth: '150px' }}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="Region (e.g., US, BR)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ flex: '1', minWidth: '120px' }}
          />
          <input
            type="number"
            className="filter-input"
            placeholder="Min Rating"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            min="0"
            max="5"
            step="0.1"
            style={{ width: '120px' }}
          />
          <select
            className="filter-input"
            value={inventoryStatus}
            onChange={(e) => setInventoryStatus(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">🔍 Searching...</div>}

      {results && !loading && (
        <div className="results-container">
          <div className="results-header">
            <div className="results-count">
              Found {totalResults.toLocaleString()} results
              {results.took && ` in ${results.took}ms`}
            </div>
          </div>

          {results.results.length === 0 ? (
            <div className="empty-state">
              <h3>No results found</h3>
              <p>Try adjusting your search query or filters</p>
            </div>
          ) : (
            <>
              <div className="results-list">
                {results.results.map((product) => (
                  <div key={product.id} className="result-item">
                    <div className="result-title">{product.title}</div>
                    <div className="result-vendor">by {product.vendor}</div>
                    <div className="result-description">
                      {product.description || 'No description available'}
                    </div>
                    <div className="result-meta">
                      <span className="meta-item">
                        <span className="badge badge-category">{product.category}</span>
                      </span>
                      <span className="meta-item">
                        ⭐ {product.supplier_rating?.toFixed(1) || 'N/A'}
                      </span>
                      <span
                        className={`meta-item badge badge-stock ${
                          product.inventory_status === 'low_stock'
                            ? 'low'
                            : product.inventory_status === 'out_of_stock'
                            ? 'out'
                            : ''
                        }`}
                      >
                        {product.inventory_status?.replace('_', ' ') || 'unknown'}
                      </span>
                      {product.unit_of_measure && (
                        <span className="meta-item">
                          📦 {product.unit_of_measure}
                        </span>
                      )}
                      {product.bulk_pack_size && (
                        <span className="meta-item">
                          📋 {product.bulk_pack_size}
                        </span>
                      )}
                      {product.region_availability && (
                        <span className="meta-item">
                          🌍 {product.region_availability.join(', ')}
                        </span>
                      )}
                      {product.score && (
                        <span className="meta-item">
                          Score: {product.score.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {(hasMore || canGoBack) && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={handlePreviousPage}
                    disabled={!canGoBack}
                  >
                    Previous
                  </button>
                  <div className="pagination-info">
                    Showing {results.results.length} of {totalResults.toLocaleString()} results
                    {hasMore && ' (more available)'}
                  </div>
                  <button
                    className="pagination-button"
                    onClick={handleNextPage}
                    disabled={!hasMore}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="results-container">
          <div className="empty-state">
            <h3>👋 Welcome to Lilo Search</h3>
            <p>Enter a search query above to find products</p>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#999' }}>
              Try: "nitrile gloves", "3 hp pump", "tomato", "tomato makeup"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

