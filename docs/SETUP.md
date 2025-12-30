# Quick Setup Guide

Follow these steps to get the Lilo Search Engine up and running.

## Step 1: Start Elasticsearch

### Option A: Docker (Recommended)

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

Wait ~30 seconds for Elasticsearch to start, then verify:
```bash
curl http://localhost:9200
```

You should see JSON response with cluster info.

### Option B: Local Installation

Follow [Elasticsearch installation guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html)

## Step 2: Setup Backend

```bash
cd server

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
ELASTICSEARCH_NODE=http://localhost:9200
PORT=3001
FRONTEND_URL=http://localhost:3000
EOF

# Note: Embeddings use BAAI/bge-small-en which runs locally - no API keys needed!
# The model will be downloaded automatically on first run (~100MB)

# Start the server
npm run start:dev
```

The server will start on `http://localhost:3001`

## Step 3: Index Data

In a new terminal:

```bash
# Create the index
curl -X POST http://localhost:3001/indexing/create

# Index all products (this may take 1-2 minutes)
curl -X POST http://localhost:3001/indexing/index
```

You should see logs indicating indexing progress.

## Step 4: Setup Frontend

In a new terminal:

```bash
cd client

# Install dependencies
npm install

# Start the frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Test the Search

### Via Frontend

1. Go to http://localhost:3000
2. Enter a query like "nitrile gloves"
3. Click Search
4. See results!

### Via API

```bash
# Basic search (JSON body format)
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"nitrile gloves","size":20}'

# With personalization
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"pump","userId":"user_136","size":20}'

# With filters
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"gloves","filters":{"category":"Safety","minRating":4.0},"size":20}'
```

## Troubleshooting

### Elasticsearch Connection Error

**Error**: `Failed to connect to Elasticsearch`

**Solution**:
1. Make sure Elasticsearch is running: `curl http://localhost:9200`
2. Check the `ELASTICSEARCH_NODE` in `server/.env`
3. Wait a bit longer if you just started Elasticsearch (it takes ~30s to boot)

### Index Already Exists

**Error**: `resource_already_exists_exception`

**Solution**: Delete and recreate:
```bash
curl -X DELETE http://localhost:9200/products
curl -X POST http://localhost:3001/indexing/create
curl -X POST http://localhost:3001/indexing/index
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**: Change the port in `server/.env`:
```
PORT=3002
```

### Frontend Can't Connect to API

**Error**: Network error in browser

**Solution**: 
1. Make sure backend is running on port 3001
2. Check `NEXT_PUBLIC_API_URL` in `client/.env.local` (or use default)
3. Check CORS settings in `server/src/main.ts`

## Next Steps

- Read [README.md](README.md) for overview
- Read [docs/DESIGN.md](docs/DESIGN.md) for architecture details
- Test different queries to see the search in action
- Note: Hybrid search with embeddings is enabled by default using local BAAI/bge-small-en model

## Example Queries to Try

1. `nitrile gloves` - Basic search
2. `nitril glovs` - Test typo handling
3. `spanner` - Test synonym expansion (finds wrenches)
4. `3 hp pump` - Test unit normalization
5. `tomato` - Test ambiguous query
6. `tomato makeup` - Test context disambiguation
7. `pvc pipe 50mm` - Test attribute matching

Happy searching! 🔍

