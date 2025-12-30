'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Product {
  _id: string;
  title: string;
  description: string;
  vendor: string;
  category: string;
  supplier_rating: number;
  inventory_status: string;
  unit_of_measure: string;
  bulk_pack_size?: string;
  region_availability?: string[];
  score?: number;
}

interface SearchResponse {
  query: string;
  total: number | { value: number };
  results: Product[];
  took: number;
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
  const [page, setPage] = useState(0);
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

  const handleSearch = async (pageNum = 0) => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setPage(pageNum);

    try {
      const params: any = {
        q: query,
        size: 20,
        from: pageNum * 20,
      };

      if (userId) params.userId = userId;
      if (category) params.category = category;
      if (vendor) params.vendor = vendor;
      if (region) params.region = region;
      if (minRating) params.minRating = parseFloat(minRating);
      if (inventoryStatus) params.inventoryStatus = inventoryStatus;

      const response = await axios.get<SearchResponse>(`${API_URL}/search`, {
        params,
      });

      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(0);
  };

  const totalResults = results?.total
    ? typeof results.total === 'object'
      ? results.total.value
      : results.total
    : 0;

  const totalPages = Math.ceil(totalResults / 20);

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
                  <div key={product._id} className="result-item">
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

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={() => handleSearch(page - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(0, Math.min(page - 2 + i, totalPages - 5));
                    if (i >= totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-button ${page === pageNum ? 'active' : ''}`}
                        onClick={() => handleSearch(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    className="pagination-button"
                    onClick={() => handleSearch(page + 1)}
                    disabled={page >= totalPages - 1}
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

