#!/bin/bash
# Frontend Deploy script
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting Frontend deployment..."

# Pull latest code
if [ -d .git ]; then
    git pull
fi

# Build images
docker compose build --no-cache

# Stop old containers
docker compose down

# Start new containers
docker compose up -d

# Wait for services
sleep 5

# Check status
docker compose ps

echo "✅ Frontend deployment completed!"


































