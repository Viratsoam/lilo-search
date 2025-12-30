# Search API Documentation

## Overview

The Search API uses **JSON body format** for requests, making it scalable and easy to extend with new features. Feature flags can be controlled both via environment variables (global defaults) and per-request (request-level overrides).

## Endpoint

### POST /search

Main search endpoint using JSON body format.

**Request:**
```json
{
  "query": "nitrile gloves",
  "userId": "user_136",
  "filters": {
    "category": "Safety > Gloves",
    "minRating": 4.0,
    "inventoryStatus": "in_stock"
  },
  "size": 20,
  "from": 0,
  "searchAfter": null,
  "featureFlags": {
    "searchStrategy": "hybrid",
    "hybridSearchEnabled": true,
    "personalizationEnabled": true,
    "fuzzyMatchingEnabled": true
  }
}
```

**Response:**
```json
{
  "query": "nitrile gloves",
  "total": {
    "value": 1728,
    "relation": "eq"
  },
  "results": [
    {
      "id": "a3bfa04681079bb2df691aa4",
      "title": "Nitrile Gloves OEM",
      "description": "...",
      "vendor": "Acme Industrial",
      "score": 38.35,
      "supplier_rating": 4.2,
      "inventory_status": "in_stock"
    }
  ],
  "took": 45,
  "pagination": {
    "size": 20,
    "nextCursor": [38.35, "a3bfa04681079bb2df691aa4"],
    "hasMore": true
  }
}
```

## Feature Flags in Requests

### Request-Level Feature Flags

You can override environment variable defaults by including `featureFlags` in your request:

```json
{
  "query": "gloves",
  "featureFlags": {
    "searchStrategy": "keyword_only",
    "personalizationEnabled": false,
    "fuzzyMatchingEnabled": true
  }
}
```

### Available Feature Flags

| Flag | Type | Description | Values |
|------|------|-------------|--------|
| `searchStrategy` | enum | Override search strategy | `hybrid`, `keyword_only`, `semantic_only` |
| `hybridSearchEnabled` | boolean | Enable/disable hybrid search | `true`, `false` |
| `personalizationEnabled` | boolean | Enable/disable personalization | `true`, `false` |
| `fuzzyMatchingEnabled` | boolean | Enable/disable fuzzy matching | `true`, `false` |
| `synonymExpansionEnabled` | boolean | Enable/disable synonym expansion | `true`, `false` |

### Feature Flag Priority

1. **Request-level flags** (highest priority) - Override environment defaults
2. **Environment variables** - Global defaults
3. **System defaults** - Fallback values

**Note:** The global `SEARCH_ENABLED` flag cannot be overridden per-request for security reasons.

## Schema Files

- **Request Schema:** `dto/search-request.dto.ts`
- **Response Schema:** `dto/search-response.dto.ts`
- **Filters Schema:** `dto/search-filters.dto.ts`
- **Feature Flags Schema:** `dto/feature-flags.dto.ts`
- **JSON Schema:** `schemas/search-api.schema.json`

## Benefits of JSON Format

1. **Scalable:** Easy to add new fields without breaking changes
2. **Type-Safe:** TypeScript DTOs ensure type safety
3. **Complex Structures:** Supports nested objects and arrays
4. **Validation:** Automatic validation with class-validator
5. **Documentation:** Schema files provide clear API documentation
6. **Feature Flags:** Per-request feature flag overrides

## Example Usage

### Basic Search
```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gloves",
    "size": 20
  }'
```

### Search with Feature Flags Override
```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gloves",
    "userId": "user_136",
    "featureFlags": {
      "searchStrategy": "hybrid",
      "personalizationEnabled": true,
      "fuzzyMatchingEnabled": true
    }
  }'
```

### Keyword-Only Search (Override Strategy)
```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gloves",
    "featureFlags": {
      "searchStrategy": "keyword_only"
    }
  }'
```

### Search Without Personalization
```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gloves",
    "userId": "user_136",
    "featureFlags": {
      "personalizationEnabled": false
    }
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3001/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'gloves',
    userId: 'user_136',
    featureFlags: {
      searchStrategy: 'hybrid',
      personalizationEnabled: true,
      fuzzyMatchingEnabled: true
    },
    size: 20
  })
});

const data = await response.json();
```

## Legacy GET Endpoint

The GET endpoint is deprecated but still available for backward compatibility:
```
GET /search?q=gloves&userId=user_136&category=Safety
```

**Note:** Use POST with JSON body for new integrations. GET endpoint does not support feature flags.

## Environment Variables vs Request Flags

### Environment Variables (Global Defaults)
Set in `.env` file or environment:
```bash
SEARCH_STRATEGY=hybrid
PERSONALIZATION_ENABLED=true
FUZZY_MATCHING_ENABLED=true
```

### Request Flags (Per-Request Overrides)
Include in request body:
```json
{
  "query": "gloves",
  "featureFlags": {
    "searchStrategy": "keyword_only",
    "personalizationEnabled": false
  }
}
```

**Result:** This request uses `keyword_only` strategy and no personalization, even if environment defaults are different.

## Use Cases

### A/B Testing
Test different search strategies for different users:
```json
{
  "query": "gloves",
  "userId": "user_136",
  "featureFlags": {
    "searchStrategy": "hybrid"  // Test group A
  }
}
```

### Performance Testing
Disable expensive features for performance testing:
```json
{
  "query": "gloves",
  "featureFlags": {
    "personalizationEnabled": false,
    "fuzzyMatchingEnabled": false
  }
}
```

### Debugging
Enable/disable specific features to debug issues:
```json
{
  "query": "gloves",
  "featureFlags": {
    "fuzzyMatchingEnabled": false  // Test without fuzzy matching
  }
}
```
