# Running the Services - Step by Step Guide

## Quick Start (Automated)

Run the automated startup script:

```bash
./start-services.sh
```

This script will:
1. Start Elasticsearch (Docker)
2. Install dependencies
3. Start backend server
4. Create index and index products
5. Start frontend

## Manual Step-by-Step

### Step 1: Start Elasticsearch

**Option A: Using Docker (Recommended)**
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

Wait ~30 seconds, then verify:
```bash
curl http://localhost:9200
```

**Option B: If container already exists**
```bash
docker start elasticsearch
```

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

**Note**: If you get npm permission errors, try:
```bash
npm install --cache ./.npm-cache
```

Or fix npm cache permissions:
```bash
sudo chown -R $(whoami) ~/.npm
```

### Step 3: Create Backend Configuration

```bash
cd server
cat > .env << EOF
ELASTICSEARCH_NODE=http://localhost:9200
PORT=3001
FRONTEND_URL=http://localhost:3000
EOF
```

### Step 4: Start Backend Server

```bash
cd server
npm run start:dev
```

The server will start on `http://localhost:3001`

**Wait for**: "✅ BAAI/bge-small-en embedding model loaded successfully"

### Step 5: Create Index and Index Data

In a **new terminal**:

```bash
# Create index
curl -X POST http://localhost:3001/indexing/create

# Index products (this takes 1-2 minutes)
curl -X POST http://localhost:3001/indexing/index
```

You should see progress logs. Wait for completion.

### Step 6: Install Frontend Dependencies

In a **new terminal**:

```bash
cd client
npm install
```

### Step 7: Start Frontend

```bash
cd client
npm run dev
```

Frontend will start on `http://localhost:3000`

## Testing

### Test Backend API

```bash
# Health check
curl http://localhost:3001/health

# Search (JSON body format)
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"nitrile gloves","size":20}'

# Search with personalization
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query":"pump","userId":"user_136","size":20}'

# Get stats
curl http://localhost:3001/search/stats
```

### Test Frontend

1. Open browser: http://localhost:3000
2. Enter a search query: "nitrile gloves"
3. Click Search
4. See results!

## Troubleshooting

### Elasticsearch Not Starting

```bash
# Check if it's running
curl http://localhost:9200

# Check Docker
docker ps | grep elasticsearch

# View logs
docker logs elasticsearch
```

### Backend Won't Start

```bash
# Check if port 3001 is in use
lsof -i :3001

# Check backend logs
cd server
npm run start:dev
```

### Frontend Can't Connect

1. Make sure backend is running on port 3001
2. Check browser console for errors
3. Verify CORS is enabled in backend

### Embedding Model Issues

- First run downloads ~100MB model (be patient)
- Check internet connection
- Model caches in `node_modules/.cache/`
- If model fails, search falls back to keyword-only

### Indexing Fails

```bash
# Delete and recreate index
curl -X DELETE http://localhost:9200/products
curl -X POST http://localhost:3001/indexing/create
curl -X POST http://localhost:3001/indexing/index
```

## Stopping Services

### Stop Frontend
Press `Ctrl+C` in the frontend terminal

### Stop Backend
Press `Ctrl+C` in the backend terminal

### Stop Elasticsearch
```bash
docker stop elasticsearch
```

Or remove container:
```bash
docker stop elasticsearch
docker rm elasticsearch
```

## Service URLs

- **Backend API**: http://localhost:3001
- **Frontend UI**: http://localhost:3000
- **Elasticsearch**: http://localhost:9200

## Example Queries to Try

1. `nitrile gloves` - Basic search
2. `nitril glovs` - Test typo handling
3. `spanner` - Test synonym expansion
4. `3 hp pump` - Test unit normalization
5. `tomato` - Test ambiguous query
6. `tomato makeup` - Test context disambiguation

## Next Steps

- Read [README.md](README.md) for overview
- Read [docs/DESIGN.md](docs/DESIGN.md) for architecture
- Import [docs/postman-collection.json](docs/postman-collection.json) to Postman

Happy searching! 🔍

