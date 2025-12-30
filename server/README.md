# Lilo Search Engine - Backend (NestJS)

A powerful B2B ecommerce search engine built with NestJS and Elasticsearch, featuring hybrid search (keyword + vector embeddings), data quality handling, and user personalization.

## Features

- 🔍 **Hybrid Search**: Combines keyword search with semantic vector embeddings
- 🛡️ **Data Quality Handling**: Normalizes units, handles typos, synonyms, and messy data
- 👤 **User Personalization**: Boosts products based on user order history
- 🎯 **Fuzzy Matching**: Handles typos and misspellings automatically
- 📊 **Advanced Filtering**: Filter by category, vendor, region, rating, inventory status
- ⚡ **Fast & Scalable**: Built on Elasticsearch for high performance

## Prerequisites

- Node.js 18+ 
- Elasticsearch 8.x (or OpenSearch) running on `http://localhost:9200`
- (No external API keys needed - uses local BAAI/bge-small-en model)

## Installation

```bash
cd server
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
- `ELASTICSEARCH_NODE`: Your Elasticsearch URL (default: http://localhost:9200)
- `PORT`: Server port (default: 3001)

**Note**: Embeddings use BAAI/bge-small-en model which runs locally. No API keys needed!

## Running Elasticsearch

### Using Docker (Recommended)

```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "xpack.security.enrollment.enabled=false" \
  elasticsearch:8.11.0
```

### Or install locally

Follow [Elasticsearch installation guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html)

## Setup & Indexing

1. **Start the server**:
```bash
npm run start:dev
```

2. **Create the index**:
```bash
curl -X POST http://localhost:3001/indexing/create
```

3. **Index products**:
```bash
curl -X POST http://localhost:3001/indexing/index
```

Or reindex everything:
```bash
curl -X POST http://localhost:3001/indexing/reindex
```

## API Endpoints

### Health Check
```
GET /health
```

### Search
```
GET /search?q=nitrile gloves&userId=user_136&size=20
```

Query Parameters:
- `q` (required): Search query
- `userId` (optional): User ID for personalization
- `category` (optional): Filter by category
- `vendor` (optional): Filter by vendor
- `region` (optional): Filter by region (e.g., "US", "BR")
- `minRating` (optional): Minimum supplier rating
- `inventoryStatus` (optional): "in_stock", "low_stock", "out_of_stock"
- `size` (optional): Results per page (default: 20)
- `from` (optional): Pagination offset (default: 0)
- `useHybridSearch` (optional): Enable hybrid search (default: true)

### Get Product
```
GET /search/product/:id
```

### Search Suggestions
```
GET /search/suggestions?q=nitrile
```

### Statistics
```
GET /search/stats
```

### Indexing
```
POST /indexing/create      # Create index
POST /indexing/index       # Index products
POST /indexing/reindex     # Recreate and reindex
GET  /indexing/mapping     # View index mapping
```

## Example Queries

Test these queries to see the search in action:

1. **Basic search**: `nitrile gloves`
2. **Typo handling**: `nitril glovs` (should still find nitrile gloves)
3. **Synonym expansion**: `spanner` (should find wrenches)
4. **Unit normalization**: `3 hp pump` (handles "hp" synonym)
5. **Context disambiguation**: 
   - `tomato` (should return food items)
   - `tomato makeup` (should return cosmetics)
6. **Fuzzy matching**: `sewage pumpe` (typo in pump)

## Architecture

### Index Design

The Elasticsearch index includes:
- **Custom analyzers** with synonym expansion
- **Multi-field mappings** for exact and fuzzy matching
- **Dense vector field** for semantic search (if embeddings enabled)
- **Normalized fields** for consistent filtering

### Search Strategy

1. **Keyword Search**: Multi-match across title, description, vendor, category
2. **Fuzzy Matching**: Automatic typo correction
3. **Synonym Expansion**: Uses synonyms.json for query expansion
4. **Vector Search**: Semantic similarity using BAAI/bge-small-en embeddings (runs locally)
5. **Personalization**: Boosts products from user's order history
6. **Function Scoring**: Additional boosts for high ratings and in-stock items

### Data Quality Handling

- **Unit Normalization**: Converts kg/kg./kilograms → kilogram
- **Category Normalization**: Handles inconsistent separators (>, >>)
- **Attribute Key Normalization**: Fixes typos like "bulkaPck" → "bulk_pack"
- **Text Cleaning**: Removes noise characters (###, $$, %%, @@)
- **Bulk Pack Normalization**: Converts "half-dozen" → "6 pcs"

## Development

```bash
# Development mode with hot reload
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Lint
npm run lint

# Format
npm run format
```

## Testing with Postman

Import the API collection or test manually:

1. **Health Check**: `GET http://localhost:3001/health`
2. **Create Index**: `POST http://localhost:3001/indexing/create`
3. **Index Products**: `POST http://localhost:3001/indexing/index`
4. **Search**: `GET http://localhost:3001/search?q=nitrile gloves`
5. **Personalized Search**: `GET http://localhost:3001/search?q=pump&userId=user_136`

## Next Steps

- See `client/README.md` for frontend setup
- Check `docs/DESIGN.md` for detailed design decisions

