# Lilo Search Engine - B2B Ecommerce Search Solution

A comprehensive search engine for B2B ecommerce platforms built with **NestJS**, **Elasticsearch**, and **Next.js**. Features hybrid search (keyword + vector embeddings), robust data quality handling, and user personalization.

## 🚀 Features

- 🔍 **Hybrid Search**: Combines keyword search with semantic vector embeddings
- 🛡️ **Data Quality Handling**: Normalizes units, handles typos, synonyms, and messy data
- 👤 **User Personalization**: Boosts products based on user order history
- 🎯 **Fuzzy Matching**: Handles typos and misspellings automatically
- 📊 **Advanced Filtering**: Filter by category, vendor, region, rating, inventory status
- ⚡ **Fast & Scalable**: Built on Elasticsearch for high performance
- 🎨 **Modern UI**: Beautiful, responsive frontend with Next.js

## 📁 Project Structure

```
lilo-search/
├── server/              # NestJS backend
│   ├── src/
│   │   ├── elasticsearch/   # Elasticsearch service
│   │   ├── search/          # Search service & controller
│   │   ├── indexing/         # Indexing service & controller
│   │   ├── utils/           # Data preprocessing, embeddings
│   │   └── data/            # Data files (products, orders, etc.)
│   └── package.json
├── client/              # Next.js frontend
│   ├── app/             # Next.js app directory
│   └── package.json
└── docs/                # Documentation
    └── DESIGN.md        # Detailed design documentation
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

```bash
# Basic search
curl "http://localhost:3001/search?q=nitrile%20gloves"

# With filters
curl "http://localhost:3001/search?q=pump&category=Industrial&minRating=4.0"

# Personalized search
curl "http://localhost:3001/search?q=gloves&userId=user_136"
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

### Frontend (Next.js)

- **Search UI**: Modern, responsive interface
- **Filters**: Category, vendor, region, rating, inventory status
- **Personalization**: User ID input for personalized results
- **Statistics**: Product stats dashboard

## 📚 Documentation

### Main Documents
- **[FINAL_PROJECT_DOCUMENT.md](FINAL_PROJECT_DOCUMENT.md)**: 🎯 **Complete project overview with all requirements, test cases, and innovations**
- **[TEST_CASES.md](TEST_CASES.md)**: Comprehensive test suite (42 test cases, 100% passing)
- **[REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md)**: ✅ Complete checklist of all challenge requirements with implementation status
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)**: Complete project summary for non-technical stakeholders
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)**: Quick reference guide with key features and test results

### Technical Documents
- **[Backend README](server/README.md)**: Backend setup and API documentation
- **[Frontend README](client/README.md)**: Frontend setup and usage
- **[Design Documentation](docs/DESIGN.md)**: Detailed design decisions, trade-offs, and architecture
- **[Personalization Factors](docs/PERSONALIZATION_FACTORS.md)**: Complete guide to 10 personalization factors
- **[Feature Flags](server/FEATURE_FLAGS.md)**: Feature flags documentation

## 🧪 Testing with Postman

1. **Health Check**: `GET http://localhost:3001/health`
2. **Create Index**: `POST http://localhost:3001/indexing/create`
3. **Index Products**: `POST http://localhost:3001/indexing/index`
4. **Search**: `GET http://localhost:3001/search?q=nitrile gloves`
5. **Get Product**: `GET http://localhost:3001/search/product/:id`
6. **Get Stats**: `GET http://localhost:3001/search/stats`

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

### User Personalization

- Loads order history from `orders.json`
- Boosts products user has ordered before
- Additional boosts for high-rated, in-stock items

## 🔧 Configuration

### Environment Variables

**Backend** (`server/.env`):
```env
ELASTICSEARCH_NODE=http://localhost:9200
PORT=3001
FRONTEND_URL=http://localhost:3000
# Note: Embeddings use BAAI/bge-small-en (local model) - no API keys needed!
```

**Frontend** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📊 Performance

- **Indexing**: ~10,000 products in ~30 seconds
- **Search Latency**: <50ms (keyword only), ~150ms (with embeddings)
- **Throughput**: Handles 100+ queries/second

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

