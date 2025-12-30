# Lilo Search Engine - Design Documentation

## Executive Summary

This document outlines the design decisions, architecture, and implementation details of the Lilo Search Engine - a B2B ecommerce search solution built with NestJS, Elasticsearch, and Next.js. The system handles messy, inconsistent data while delivering relevant, personalized search results.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Index Design and Mapping](#index-design-and-mapping)
3. [Data Quality Handling](#data-quality-handling)
4. [Search Strategy](#search-strategy)
5. [User Personalization](#user-personalization)
6. [Hybrid Search Implementation](#hybrid-search-implementation)
7. [Trade-offs and Decisions](#trade-offs-and-decisions)
8. [Maintenance and Operations](#maintenance-and-operations)

---

## Architecture Overview

### System Components

```
┌─────────────────┐
│   Next.js UI    │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│  NestJS API     │
│  (Backend)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────────┐
│Elastic│ │ BAAI/bge-   │
│search │ │ small-en    │
│       │ │ (Local)     │
└───────┘ └─────────────┘
```

### Technology Stack

- **Backend**: NestJS (Node.js/TypeScript)
- **Search Engine**: Elasticsearch 8.x
- **Vector Embeddings**: BAAI/bge-small-en-v1.5 (local model, always enabled)
- **Frontend**: Next.js 14 with React
- **Data Processing**: Custom preprocessing service

---

## Index Design and Mapping

### Index Structure

The `products` index is designed to handle the messy nature of the provided dataset while maintaining search performance.

#### Key Design Decisions

1. **Single Index Approach**: All products in one index for simplicity and cross-category search
2. **Custom Analyzers**: Multiple analyzers for different use cases
3. **Multi-field Mappings**: Same field indexed multiple ways (exact, fuzzy, keyword)
4. **Dense Vector Field**: Optional 1536-dimensional vector for semantic search

#### Analyzers

**1. `product_analyzer` (Default for text fields)**
- **Tokenizer**: `standard` - splits on whitespace and punctuation
- **Filters**:
  - `lowercase` - Case-insensitive matching
  - `synonym_filter` - Expands queries using synonyms.json
  - `stop` - Removes common stop words
  - `asciifolding` - Normalizes accented characters
- **Use Case**: General product search with synonym expansion

**2. `exact_analyzer`**
- **Tokenizer**: `keyword` - Treats entire field as single token
- **Filters**: `lowercase`
- **Use Case**: Exact phrase matching, filtering

**3. `category_analyzer`**
- **Tokenizer**: `pattern` - Splits on `>` separator
- **Filters**: `lowercase`, `trim`
- **Use Case**: Category hierarchy search (handles inconsistent separators)

#### Field Mappings

```json
{
  "title": {
    "type": "text",
    "analyzer": "product_analyzer",
    "fields": {
      "exact": { "analyzer": "exact_analyzer" },
      "keyword": { "type": "keyword" }
    },
    "boost": 3.0  // Highest boost for title matches
  },
  "description": {
    "type": "text",
    "analyzer": "product_analyzer",
    "boost": 1.5
  },
  "category": {
    "type": "text",
    "analyzer": "category_analyzer",
    "fields": {
      "keyword": { "type": "keyword" },
      "exact": { "analyzer": "exact_analyzer" }
    },
    "boost": 2.0
  },
  "embedding": {
    "type": "dense_vector",
    "dims": 1536,
    "index": true,
    "similarity": "cosine"
  }
}
```

#### Boosting Strategy

- **Title**: 3.0x (most important)
- **Category**: 2.0x (important for B2B categorization)
- **Description**: 1.5x
- **Vendor/SKU**: 1.0x

**Rationale**: B2B buyers often search by specific product names or categories. Title matches are most relevant.

---

## Data Quality Handling

### Challenges Identified

1. **Inconsistent Units**: `kg`, `kg.`, `kilograms`, `lbs`, `pounds`
2. **Category Hierarchies**: `>`, `>>`, inconsistent spacing
3. **Attribute Key Typos**: `bulkaPck`, `opwer_hp`, `coolr`
4. **Text Noise**: `###`, `$$`, `%%`, `@@` in descriptions
5. **Missing Fields**: Null/undefined values
6. **Synonym Variations**: `colour` vs `color`, `litre` vs `liter`

### Solutions Implemented

#### 1. Unit Normalization

**Problem**: Products use inconsistent unit formats.

**Solution**: Normalization mapping in `DataPreprocessorService`:
```typescript
{
  'kg': 'kilogram',
  'kg.': 'kilogram',
  'kilograms': 'kilogram',
  'lbs': 'pound',
  // ... etc
}
```

**Trade-off**: Loss of original unit format, but enables consistent filtering and search.

#### 2. Category Normalization

**Problem**: Inconsistent separators (`>`, `>>`) and spacing.

**Solution**: Regex normalization:
```typescript
category.replace(/>+/g, '>').replace(/\s*>\s*/g, ' > ')
```

**Result**: `Industrial>>Pumps>Water` → `Industrial > Pumps > Water`

#### 3. Attribute Key Normalization

**Problem**: Typos in attribute keys (`bulkaPck`, `opwer_hp`).

**Solution**: Typo correction mapping:
```typescript
{
  'bulkapck': 'bulk_pack',
  'opwer_hp': 'power_hp',
  'coolr': 'color'
}
```

**Fallback**: Lowercase and sanitize unknown keys.

#### 4. Text Cleaning

**Problem**: Noise characters in descriptions.

**Solution**: Remove noise patterns:
```typescript
text.replace(/###|\$\$|%%|@@/g, '')
    .replace(/\s+/g, ' ')
    .trim()
```

#### 5. Synonym Expansion

**Problem**: Users search with different terms than indexed.

**Solution**: Elasticsearch synonym filter using `synonyms.json`:
- Bidirectional synonyms: `hp,horsepower` and `horsepower,hp`
- Query expansion: `hp` matches `horsepower` automatically

**Example**: Query "spanner" finds products with "wrench" in title.

---

## Search Strategy

### Multi-Stage Query Construction

#### Stage 1: Keyword Search (Must Clause)

```json
{
  "multi_match": {
    "query": "nitrile gloves",
    "fields": [
      "title^3",
      "description^1.5",
      "vendor^1",
      "searchable_text^1",
      "category^2"
    ],
    "type": "best_fields",
    "fuzziness": "AUTO",
    "operator": "or",
    "minimum_should_match": "75%"
  }
}
```

**Features**:
- **Fuzziness AUTO**: Automatically adjusts based on term length
- **Field Boosting**: Title matches weighted 3x
- **Minimum Should Match**: 75% of terms must match (handles partial queries)

#### Stage 2: Exact Phrase Boost (Should Clause)

```json
{
  "match_phrase": {
    "title": {
      "query": "nitrile gloves",
      "boost": 5.0
    }
  }
}
```

**Purpose**: Exact phrase matches get highest boost.

#### Stage 3: Fuzzy Matching (Should Clause)

```json
{
  "match": {
    "title": {
      "query": "nitril glovs",
      "fuzziness": 2,
      "boost": 2.0
    }
  }
}
```

**Purpose**: Handles typos (e.g., "nitril" → "nitrile").

#### Stage 4: Hybrid Search (Vector Similarity)

If embeddings enabled:
```json
{
  "script_score": {
    "query": { "match_all": {} },
    "script": {
      "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
      "params": { "query_vector": [0.1, 0.2, ...] }
    },
    "boost": 1.5
  }
}
```

**Purpose**: Semantic similarity for queries like "hand protection" → "gloves".

### Query Examples

#### Example 1: "3 hp sewage pump"

**Processing**:
1. Synonym expansion: `hp` → `horsepower`
2. Multi-match across title, description, attributes
3. Fuzzy matching for "sewage" variations
4. Vector search for semantic "pump" matches

**Expected Results**: Products with "3 HP", "3 horsepower" in title/description, high relevance for sewage pumps.

#### Example 2: "tomato" vs "tomato makeup"

**Context Disambiguation**:
- Query "tomato": Multi-match finds both food and cosmetics
- Query "tomato makeup": Phrase match boosts cosmetics, category filter helps

**Enhancement Opportunity**: Could use ML classification to detect intent, but current approach works via phrase matching.

#### Example 3: "nitril glovs" (typos)

**Fuzzy Matching**:
- `fuzziness: AUTO` corrects "nitril" → "nitrile"
- `fuzziness: 2` corrects "glovs" → "gloves"
- Still returns relevant results despite typos

---

## User Personalization

### Implementation

#### Order History Loading

On service initialization, `orders.json` is loaded and user-product relationships are indexed:
```typescript
Map<userId, Set<productIds>>
```

#### Boosting Strategy

**1. Terms Query Boost**:
```json
{
  "terms": {
    "_id": ["product_id_1", "product_id_2", ...],
    "boost": 2.0
  }
}
```

**2. Function Score**:
```json
{
  "function_score": {
    "functions": [
      {
        "filter": { "terms": { "_id": userProducts } },
        "weight": 1.5
      },
      {
        "filter": { "range": { "supplier_rating": { "gte": 4.0 } } },
        "weight": 1.2
      },
      {
        "filter": { "term": { "inventory_status": "in_stock" } },
        "weight": 1.1
      }
    ],
    "score_mode": "multiply",
    "boost_mode": "multiply"
  }
}
```

### User Personas

#### Persona 1: Industrial Buyer (user_136)

**Characteristics**:
- Orders industrial equipment (pumps, compressors)
- Prefers high-rated suppliers
- Needs in-stock items

**Boosting**:
- Products from order history: 2.0x
- High-rated suppliers: 1.2x
- In-stock items: 1.1x

**Query**: "pump"
**Result**: Previously ordered pumps appear first, then high-rated in-stock pumps.

#### Persona 2: Safety Equipment Buyer

**Characteristics**:
- Orders safety gear (gloves, masks)
- Bulk purchases
- Price-sensitive

**Boosting**:
- Similar to Persona 1, but could add bulk_pack_size boost

**Enhancement Opportunity**: Category-specific boosting based on user's category preferences.

---

## Hybrid Search Implementation

### Architecture

```
Query: "hand protection equipment"
         │
         ├─→ Keyword Search (Elasticsearch)
         │   └─→ Finds: "gloves", "handwear"
         │
         └─→ Vector Search (BAAI/bge-small-en)
             └─→ Finds: "safety gloves", "protective handwear"
             
         Combine Results → Hybrid Search
```

### Embedding Generation

**Model**: BAAI/bge-small-en-v1.5 (via @xenova/transformers)
- **Dimensions**: 384
- **Cost**: Free (runs locally)
- **Latency**: ~50-150ms per query (first run slower due to model loading)
- **Model Size**: ~100MB (downloaded automatically on first run)

**Process**:
1. Model loads on application startup (quantized version for faster loading)
2. Generate embedding for search query (with "query: " prefix for better results)
3. Use `cosineSimilarity` in Elasticsearch script_score
4. Combine with keyword search results

**Advantages**:
- No external API dependencies
- No API costs
- Data privacy (embeddings generated locally)
- Always available (no rate limits)

### When to Use Hybrid Search

**Enabled By Default** - No configuration needed!

**Benefits**:
- Semantic understanding: "hand protection" → "gloves"
- Context awareness: Better disambiguation
- Multilingual support (future)

**Trade-offs**:
- **Memory**: Model uses ~200-300MB RAM when loaded
- **Initial Load**: First request slower (~2-5s) while model loads
- **Model Size**: ~100MB download on first run

**Benefits**:
- No API costs
- No rate limits
- Data privacy
- Always available

**Fallback**: If model fails to load, pure keyword search works fine.

---

## Trade-offs and Decisions

### 1. Single Index vs. Multiple Indices

**Decision**: Single index for all products.

**Pros**:
- Simpler architecture
- Cross-category search
- Easier maintenance

**Cons**:
- Less category-specific optimization
- Larger index size

**Alternative Considered**: Separate indices per category (rejected for simplicity).

### 2. Real-time Embeddings vs. Pre-computed

**Decision**: Generate embeddings on-the-fly for queries, pre-compute for products.

**Rationale**:
- Queries are dynamic (can't pre-compute all)
- Products are static (index once)
- Balance between freshness and performance

**Trade-off**: Query latency vs. storage cost.

### 3. Synonym Filter vs. Query-time Expansion

**Decision**: Index-time synonym filter.

**Pros**:
- Faster queries (no expansion needed)
- Consistent results

**Cons**:
- Index rebuild required for synonym updates
- Larger index size

**Alternative**: Query-time expansion (rejected for performance).

### 4. Fuzzy Matching: AUTO vs. Fixed

**Decision**: `fuzziness: AUTO`.

**Rationale**:
- Automatically adjusts: 0 for 1-2 chars, 1 for 3-5, 2 for 6+
- Better precision than fixed fuzziness

### 5. Function Score vs. Simple Boost

**Decision**: Function score with multiple factors.

**Rationale**:
- More flexible boosting
- Can combine multiple signals
- Better personalization

**Complexity**: Higher, but worth it for relevance.

---

## Maintenance and Operations

### Synonym Dictionary Management

**Current**: Static `synonyms.json` file.

**Process**:
1. Update `synonyms.json`
2. Reindex products: `POST /indexing/reindex`

**Future Enhancements**:
- Admin UI for synonym management
- A/B testing for synonym effectiveness
- Auto-discovery from query logs

### Category Taxonomy Updates

**Current**: Normalization handles inconsistencies.

**Process**:
1. Update normalization logic in `DataPreprocessorService`
2. Reindex

**Future**:
- Category mapping service
- ML-based category classification
- User feedback loop

### Data Quality Monitoring

**Metrics to Track**:
1. **Search Success Rate**: % of queries with results
2. **Click-through Rate**: % of results clicked
3. **Zero-result Queries**: Queries with no results
4. **Typo Correction Rate**: Queries with fuzzy matches

**Implementation**:
```typescript
// Log search queries and results
logger.log({
  query,
  resultsCount,
  took,
  userId,
  filters
});
```

**Alerts**:
- Zero-result rate > 10%
- Average response time > 500ms
- Error rate > 1%

### Relevance Tuning

#### A/B Testing Framework

**Test Variations**:
1. Boost weights (title: 3.0 vs. 4.0)
2. Fuzzy matching (AUTO vs. fixed)
3. Hybrid search (enabled vs. disabled)

**Metrics**:
- Click-through rate
- Conversion rate
- Time to first click

#### Manual Tuning

**Process**:
1. Identify underperforming queries
2. Adjust boost weights
3. Add synonyms
4. Reindex and test

**Tools**:
- Query performance dashboard
- Relevance feedback UI
- Search analytics

### Performance Optimization

#### Index Optimization

**Current Settings**:
- Shards: 1 (single node)
- Replicas: 0 (development)

**Production Recommendations**:
- Shards: 3-5 (based on data size)
- Replicas: 1-2 (for HA)
- Refresh interval: 1s (real-time) or 30s (batch)

#### Query Optimization

**Caching Strategy**:
- Cache frequent queries (Redis)
- Cache embeddings (if same query repeated)
- Cache aggregations (stats, filters)

**Pagination**:
- Use `search_after` for deep pagination (better than `from`)
- Limit `size` to 100 max

### Scaling Considerations

#### Horizontal Scaling

**Elasticsearch Cluster**:
- Add data nodes as data grows
- Use index aliases for zero-downtime reindexing
- Shard allocation based on data distribution

#### API Scaling

**NestJS**:
- Stateless API (easy horizontal scaling)
- Load balancer (nginx/HAProxy)
- Connection pooling for Elasticsearch

#### Embedding Service

**Current**: BAAI/bge-small-en via @xenova/transformers
- Runs locally, no external dependencies
- Quantized model for faster loading and lower memory
- Automatic model download on first run

**Future Options**:
1. **GPU Acceleration**: Use ONNX Runtime for faster inference
2. **Model Caching**: Cache embeddings for frequently searched products
3. **Alternative Models**: Easy to swap to other BGE models or sentence-transformers

---

## Example Queries and Outcomes

### Query 1: "3 hp sewage pump weir"

**Expected Behavior**:
1. Synonym expansion: `hp` → `horsepower`
2. Multi-match finds products with "3 hp", "3 horsepower"
3. Phrase match boosts exact "sewage pump" matches
4. Category filter helps if "weir" in category

**Result**: High relevance for sewage pumps with 3 HP rating.

### Query 2: "nitrile glove bulk pack"

**Expected Behavior**:
1. Synonym expansion: `glove` → `handwear` (optional)
2. Attribute match: `bulk_pack` in attributes
3. Phrase match for "nitrile glove"
4. Fuzzy matching handles "glove" vs "gloves"

**Result**: Nitrile gloves with bulk pack attributes ranked highest.

### Query 3: "pvc pipe 50mm"

**Expected Behavior**:
1. Synonym: `pvc` → `polyvinyl chloride`
2. Attribute match: `diameter_mm: 50`
3. Category match: "Plastics > Pipes > PVC"

**Result**: PVC pipes with 50mm diameter, properly categorized.

### Query 4: "tomato" (ambiguous)

**Expected Behavior**:
1. Returns both food and cosmetics
2. Food items (category: "Food > Vegetables > Tomato") ranked higher
3. Cosmetics (category: "Cosmetics > Makeup > Face", title: "tomato color") also appear

**Enhancement**: Could use category boost to prefer food, or ML classification.

### Query 5: "tomato makeup" (disambiguated)

**Expected Behavior**:
1. Phrase match "tomato makeup" boosts cosmetics
2. Category filter helps
3. Food items filtered out

**Result**: Only cosmetics with "tomato" in name/description.

---

## Conclusion

The Lilo Search Engine successfully handles messy B2B ecommerce data while delivering relevant, personalized search results. Key innovations include:

1. **Robust Data Quality Handling**: Normalization, cleaning, synonym expansion
2. **Hybrid Search**: Keyword + vector embeddings for semantic understanding
3. **User Personalization**: Order history-based boosting
4. **Flexible Architecture**: Easy to extend and maintain

**Future Enhancements**:
- ML-based query intent classification
- Real-time synonym learning from query logs
- Advanced personalization (collaborative filtering)
- Multi-language support
- Voice search integration

---

## Appendix: API Examples

### Search Request
```bash
curl "http://localhost:3001/search?q=nitrile%20gloves&userId=user_136&size=20"
```

### Response
```json
{
  "query": "nitrile gloves",
  "total": 45,
  "results": [
    {
      "_id": "a3bfa04681079bb2df691aa4",
      "title": "Nitrile Gloves replacement high-flow colour red",
      "vendor": "United Fasteners",
      "category": "Safety > Gloves > Nitrile",
      "supplier_rating": 3.8,
      "inventory_status": "low_stock",
      "score": 12.45
    }
  ],
  "took": 23
}
```

---

*Document Version: 1.0*  
*Last Updated: 2025-01-12*

