#!/bin/bash

# Lilo Search Engine - Service Startup Script
set -e

echo "🚀 Starting Lilo Search Engine Services..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Elasticsearch is running
echo -e "${YELLOW}📦 Checking Elasticsearch...${NC}"
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Elasticsearch is running${NC}"
else
    echo -e "${RED}❌ Elasticsearch is not running${NC}"
    echo -e "${YELLOW}Starting Elasticsearch with Docker...${NC}"
    
    # Check if container exists
    if docker ps -a | grep -q elasticsearch; then
        echo "Starting existing container..."
        docker start elasticsearch
    else
        echo "Creating new Elasticsearch container..."
        docker run -d \
          --name elasticsearch \
          -p 9200:9200 \
          -p 9300:9300 \
          -e "discovery.type=single-node" \
          -e "xpack.security.enabled=false" \
          -e "xpack.security.enrollment.enabled=false" \
          elasticsearch:8.11.0
    fi
    
    echo "Waiting for Elasticsearch to start..."
    sleep 10
    
    # Wait for Elasticsearch to be ready
    for i in {1..30}; do
        if curl -s http://localhost:9200 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Elasticsearch is ready!${NC}"
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done
fi

# Install backend dependencies
echo ""
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd server
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed"
fi

# Install frontend dependencies
echo ""
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd ../client
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed"
fi

cd ..

# Create .env file if it doesn't exist
echo ""
echo -e "${YELLOW}⚙️  Checking configuration...${NC}"
if [ ! -f "server/.env" ]; then
    echo "Creating server/.env file..."
    cat > server/.env << EOF
ELASTICSEARCH_NODE=http://localhost:9200
PORT=3001
FRONTEND_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ Created server/.env${NC}"
else
    echo -e "${GREEN}✅ server/.env already exists${NC}"
fi

# Start backend in background
echo ""
echo -e "${YELLOW}🔧 Starting backend server...${NC}"
cd server
npm run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo "Backend logs: backend.log"

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is running
for i in {1..20}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running on http://localhost:3001${NC}"
        break
    fi
    echo "Waiting for backend... ($i/20)"
    sleep 2
done

# Create and index data
echo ""
echo -e "${YELLOW}📊 Creating index and indexing products...${NC}"
echo "This may take a few minutes..."

# Create index
curl -X POST http://localhost:3001/indexing/create

# Index products
curl -X POST http://localhost:3001/indexing/index

echo ""
echo -e "${GREEN}✅ Indexing complete!${NC}"

# Start frontend
echo ""
echo -e "${YELLOW}🎨 Starting frontend...${NC}"
cd ../client
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo "Frontend logs: frontend.log"

# Wait a bit for frontend to start
sleep 5

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 All services are starting!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo "📍 Services:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "🧪 Test the API:"
echo "   curl http://localhost:3001/health"
echo "   curl \"http://localhost:3001/search?q=nitrile%20gloves\""
echo ""

