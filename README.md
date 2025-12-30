# Lilo Search Engine - B2B Ecommerce Search Solution

A comprehensive search engine for B2B ecommerce platforms built with **NestJS**, **Elasticsearch**, and **Next.js**. Features hybrid search (keyword + vector embeddings), robust data quality handling, and user personalization.

## 🚀 Features

- 🔍 **Hybrid Search**: Combines keyword search with semantic vector embeddings (BAAI/bge-small-en)
- 🛡️ **Data Quality Handling**: Normalizes units, handles typos, synonyms, and messy data
- 👤 **10-Factor Personalization**: Comprehensive user personalization system
- 🎯 **Fuzzy Matching**: Handles typos and misspellings automatically
- 📊 **Advanced Filtering**: Filter by category, vendor, region, rating, inventory status
- 🔄 **Feature Flags**: Environment-driven and request-level feature flag overrides
- 📄 **Cursor-Based Pagination**: `search_after` pagination for deep result sets (no 10K limit)
- 📝 **JSON API**: All endpoints use JSON body format for scalability
- ⚡ **Fast & Scalable**: Built on Elasticsearch for high performance
- 🎨 **Modern UI**: Beautiful, responsive frontend with Next.js

## 📁 Project Structure

```
lilo-search/
├── server/              # NestJS backend
│   ├── src/
│   │   ├── elasticsearch/   # Elasticsearch service
│   │   ├── search/          # Search service & controller
│   │   ├── indexing/        # Indexing service & controller
│   │   │   └── elasticsearch-schema.json  # Elasticsearch index schema
│   │   ├── utils/           # Data preprocessing, embeddings
│   │   └── data/            # Data files (products, orders, etc.)
│   └── package.json
├── client/              # Next.js frontend
│   ├── app/             # Next.js app directory
│   └── package.json
└── docs/                # Documentation (see docs/README.md for full index)
    ├── README.md        # Documentation index
    ├── DESIGN.md        # Detailed design documentation
    ├── FINAL_PROJECT_DOCUMENT.md  # Complete project overview
    ├── REQUIREMENTS_CHECKLIST.md  # Requirements checklist
    ├── PROJECT_SUMMARY.md  # Non-technical summary
    ├── QUICK_REFERENCE.md  # Quick reference guide
    ├── TEST_CASES.md  # Comprehensive test suite
    ├── GITHUB_SETUP.md  # GitHub setup guide
    ├── FEATURE_FLAGS.md  # Feature flags documentation
    ├── EMBEDDING_MIGRATION.md  # Embedding migration guide
    ├── SETUP.md  # Setup instructions
    └── RUN.md  # Run instructions
```

### Elasticsearch Schema

The Elasticsearch index schema is defined in a separate JSON file for easy maintenance and version control:

**Location:** `server/src/indexing/elasticsearch-schema.json`

This schema file includes:
- **Index Settings:** Shards, replicas, analyzers
- **Custom Analyzers:** product_analyzer, exact_analyzer, category_analyzer
- **Field Mappings:** All product fields with types and analyzers
- **Documentation:** Inline comments explaining each field

**Dynamic Configuration:**
- Synonyms are loaded from `synonyms.json` at runtime
- Embedding field is conditionally added if embeddings are enabled

**View Schema:**
```bash
# Via API
curl http://localhost:3001/indexing/mapping

# Or view the file directly
cat server/src/indexing/elasticsearch-schema.json
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+
- Docker (for Elasticsearch) or Elasticsearch 8.x installed locally
- (No external API keys needed - uses local BAAI/bge-small-en model)

### 1. Start Elasticsearch

Using Docker (recommended):
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

Verify it's running:
```bash
curl http://localhost:9200
```

### 2. Setup Backend

```bash
cd server
npm install

# Create .env file
cat > .env << EOF
ELASTICSEARCH_NODE=http://localhost:9200
PORT=3001
FRONTEND_URL=http://localhost:3000
EOF

# Note: Embeddings use BAAI/bge-small-en which runs locally - no API keys needed!

# Start server
npm run start:dev
```

In another terminal, index the data:
```bash
# Create index
curl -X POST http://localhost:3001/indexing/create

# Index products
curl -X POST http://localhost:3001/indexing/index
```

### 3. Setup Frontend

```bash
cd client
npm install

# Start frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### Search API

All endpoints use **JSON request body** format for scalability and type safety.

```bash
# Basic search
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"nitrile gloves","size":20}'

# With filters
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query":"pump",
    "filters":{"category":"Industrial","minRating":4.0},
    "size":20
  }'

# Personalized search
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"gloves","userId":"user_136","size":20}'

# Search with pagination (search_after)
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query":"gloves",
    "size":20,
    "searchAfter":[38.35,"a3bfa04681079bb2df691aa4"]
  }'

# Search with feature flags override
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query":"gloves",
    "size":20,
    "featureFlags":{
      "searchStrategy":"hybrid",
      "personalizationEnabled":true,
      "fuzzyMatchingEnabled":true
    }
  }'

# Get suggestions
curl -X POST http://localhost:3001/search/suggestions \
  -H "Content-Type: application/json" \
  -d '{"query":"glov","size":5}'
```

### Example Queries

Test these queries to see the search in action:

1. **Basic search**: `nitrile gloves`
2. **Typo handling**: `nitril glovs` (should still find nitrile gloves)
3. **Synonym expansion**: `spanner` (should find wrenches)
4. **Unit normalization**: `3 hp pump` (handles "hp" synonym)
5. **Context disambiguation**: 
   - `tomato` (should return food items)
   - `tomato makeup` (should return cosmetics)
6. **Fuzzy matching**: `sewage pumpe` (typo in pump)

## 🏗️ Architecture

### Backend (NestJS)

- **Elasticsearch Service**: Manages Elasticsearch connection and operations
- **Search Service**: Implements hybrid search with keyword + vector embeddings
- **Indexing Service**: Handles data preprocessing and indexing
- **Data Preprocessor**: Normalizes units, categories, attributes, cleans text
- **Embedding Service**: Generates vector embeddings using BAAI/bge-small-en (runs locally, always enabled)

### Elasticsearch Schema

The index schema is defined in a **separate JSON file** for maintainability:

**File:** `server/src/indexing/elasticsearch-schema.json`

**Features:**
- ✅ **Separated from code** - Easy to version control and modify
- ✅ **Well-documented** - Inline comments explain each field
- ✅ **Dynamic configuration** - Synonyms and embeddings loaded at runtime
- ✅ **Version controlled** - Schema changes tracked in git

**Schema Components:**
- **Settings:** Shards, replicas, analyzers configuration
- **Analyzers:** 3 custom analyzers (product, exact, category)
- **Mappings:** All field definitions with types and analyzers
- **Metadata:** Schema version and documentation

**View Schema:**
```bash
# Via API endpoint
curl http://localhost:3001/indexing/mapping | jq

# Or view the file directly
cat server/src/indexing/elasticsearch-schema.json | jq
```

**Modify Schema:**
1. Edit `server/src/indexing/elasticsearch-schema.json`
2. Restart the service
3. Recreate index: `POST /indexing/reindex`

### Frontend (Next.js)

- **Search UI**: Modern, responsive interface with JSON body API integration
- **Filters**: Category, vendor, region, rating, inventory status
- **Personalization**: User ID input for personalized results (10-factor system)
- **Pagination**: Cursor-based pagination using `search_after` with next/previous navigation
- **Statistics**: Product stats dashboard
- **Real-time Search**: Instant search results with loading states

## 📚 Documentation

### Main Documents
- **[Complete Project Overview](docs/FINAL_PROJECT_DOCUMENT.md)**: 🎯 Complete project overview with all requirements, test cases, and innovations
- **[Test Cases](docs/TEST_CASES.md)**: Comprehensive test suite (42 test cases, 100% passing)
- **[Requirements Checklist](docs/REQUIREMENTS_CHECKLIST.md)**: ✅ Complete checklist of all challenge requirements with implementation status
- **[Project Summary](docs/PROJECT_SUMMARY.md)**: Complete project summary for non-technical stakeholders
- **[Quick Reference](docs/QUICK_REFERENCE.md)**: Quick reference guide with key features and test results

### Technical Documents
- **[Backend README](server/README.md)**: Backend setup and API documentation
- **[Frontend README](client/README.md)**: Frontend setup and usage
- **[Design Documentation](docs/DESIGN.md)**: Detailed design decisions, trade-offs, and architecture
- **[Personalization Factors](docs/PERSONALIZATION_FACTORS.md)**: Complete guide to 10 personalization factors
- **[Feature Flags](docs/FEATURE_FLAGS.md)**: Feature flags documentation
- **[Embedding Migration](docs/EMBEDDING_MIGRATION.md)**: Guide to embedding model migration
- **[Setup Guide](docs/SETUP.md)**: Detailed setup instructions
- **[Run Guide](docs/RUN.md)**: How to run the application
- **[GitHub Setup](docs/GITHUB_SETUP.md)**: GitHub repository setup guide

## 🧪 Testing with Postman

Import the Postman collection from `docs/postman-collection.json` for comprehensive API testing.

**Key Endpoints:**
1. **Health Check**: `GET http://localhost:3001/health`
2. **View Schema**: `GET http://localhost:3001/indexing/mapping`
3. **Create Index**: `POST http://localhost:3001/indexing/create`
4. **Index Products**: `POST http://localhost:3001/indexing/index`
5. **Search**: `POST http://localhost:3001/search` (JSON body required)
6. **Get Suggestions**: `POST http://localhost:3001/search/suggestions` (JSON body required)
7. **Get Product**: `GET http://localhost:3001/search/product/:id`
8. **Get Stats**: `GET http://localhost:3001/search/stats`

**Note:** All search endpoints use POST with JSON body format. See `docs/postman-collection.json` for complete examples.

## 🎯 Key Features Explained

### Data Quality Handling

The system handles:
- **Inconsistent units**: `kg`, `kg.`, `kilograms` → normalized to `kilogram`
- **Category typos**: `Industrial>>Pumps` → `Industrial > Pumps`
- **Attribute key typos**: `bulkaPck` → `bulk_pack`
- **Text noise**: Removes `###`, `$$`, `%%`, `@@`
- **Synonyms**: Expands queries using `synonyms.json`

### Hybrid Search

- **Keyword Search**: Fast, exact matching with fuzzy support
- **Vector Search**: Semantic understanding using BAAI/bge-small-en embeddings (local model)
- **Combined**: Best of both worlds for relevance

### User Personalization (10-Factor System)

The system implements comprehensive 10-factor personalization:

1. **User Type Inference**: Automatically infers user type from order patterns
2. **Preferred Vendors**: Boosts products from vendors user frequently orders from
3. **Region Preferences**: Prioritizes products available in user's preferred regions
4. **Quality Focus**: Boosts high-rated products for quality-conscious users
5. **Inventory Preference**: Prioritizes in-stock items for users who need immediate delivery
6. **Price Segment**: Adjusts results based on user's typical price range
7. **Order History**: Strong boost for products user has ordered before
8. **Delivery Mode**: Prioritizes products matching user's preferred delivery method
9. **Order Frequency**: Adjusts recommendations for frequent vs. occasional buyers
10. **Bulk Buying Patterns**: Boosts bulk-pack products for bulk buyers

**Usage:**
```bash
# Automatic personalization (all 10 factors applied)
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"gloves","userId":"user_136","size":20}'
```

See [Personalization Factors](docs/PERSONALIZATION_FACTORS.md) for detailed documentation.

## 🔧 Configuration

### Environment Variables

**Backend** (`server/.env`):
```env
ELASTICSEARCH_NODE=http://localhost:9200
PORT=3001
FRONTEND_URL=http://localhost:3000

# Feature Flags (optional - defaults shown)
SEARCH_ENABLED=true
SEARCH_STRATEGY=hybrid
HYBRID_SEARCH_ENABLED=true
PERSONALIZATION_ENABLED=true
FUZZY_MATCHING_ENABLED=true
SYNONYM_EXPANSION_ENABLED=true

# Note: Embeddings use BAAI/bge-small-en (local model) - no API keys needed!
```

See [Feature Flags Documentation](docs/FEATURE_FLAGS.md) for complete configuration options.

**Frontend** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📊 Performance

- **Indexing**: ~10,000 products in ~30 seconds
- **Search Latency**: 
  - <50ms (keyword only)
  - ~150ms (hybrid search with embeddings)
  - ~200ms (with full personalization)
- **Throughput**: Handles 100+ queries/second
- **Pagination**: `search_after` supports unlimited result sets (no 10K limit)
- **Embeddings**: Local BAAI/bge-small-en model (~100MB, cached after first download)

## 🚀 Production Deployment

### Recommendations

1. **Elasticsearch**:
   - Use managed service (Elastic Cloud, AWS OpenSearch)
   - Configure 3-5 shards, 1-2 replicas
   - Enable security (TLS, authentication)

2. **API**:
   - Use PM2 or Docker for process management
   - Enable rate limiting
   - Add caching (Redis) for frequent queries

3. **Frontend**:
   - Deploy to Vercel, Netlify, or similar
   - Enable CDN for static assets
   - Configure environment variables

## 🤝 Contributing

This is a challenge project. For improvements:

1. Add more synonym pairs to `synonyms.json`
2. Enhance data preprocessing logic
3. Add more personalization signals
4. Implement query analytics
5. Add A/B testing framework

## 📝 License

MIT

## 🙏 Acknowledgments

Built for the Lilo Data Engineer Challenge. Demonstrates:
- Elasticsearch index design
- Data quality handling
- Search relevance tuning
- User personalization
- Hybrid search implementation

---

**Happy Searching! 🔍**

