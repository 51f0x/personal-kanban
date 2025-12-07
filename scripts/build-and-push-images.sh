#!/bin/bash

# Script to build and push Docker images to registry
# Usage: ./scripts/build-and-push-images.sh [registry-port] [image-tag]

set -e

REGISTRY_HOST="${REGISTRY_HOST:-192.168.1.53}"
REGISTRY_PORT="${REGISTRY_PORT:-5000}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY_HOST}:${REGISTRY_PORT}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building and pushing Docker images to ${REGISTRY}${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY}${NC}"
echo -e "${YELLOW}Tag: ${IMAGE_TAG}${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if registry is configured as insecure (for HTTP registries)
echo -e "${BLUE}Checking registry configuration...${NC}"
if ! docker info 2>/dev/null | grep -q "${REGISTRY}"; then
    echo -e "${YELLOW}Warning: Registry ${REGISTRY} is not in Docker's insecure-registries list.${NC}"
    echo -e "${YELLOW}If your registry uses HTTP (not HTTPS), you need to configure it.${NC}"
    echo ""
    echo "Run this script to configure it:"
    echo "  ./scripts/configure-insecure-registry.sh"
    echo ""
    echo "Or manually configure Docker:"
    echo "  Linux: Edit /etc/docker/daemon.json and add:"
    echo "    { \"insecure-registries\": [\"${REGISTRY}\"] }"
    echo "  Then restart Docker: sudo systemctl restart docker"
    echo ""
    echo "  Docker Desktop: Settings > Docker Engine > Add to insecure-registries"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to build and push an image
build_and_push() {
    local service=$1
    local dockerfile=$2
    local image_name="personal-kanban-${service}"
    local full_image="${REGISTRY}/${image_name}:${IMAGE_TAG}"
    
    echo -e "${BLUE}Building ${image_name} for linux/amd64...${NC}"
    docker buildx build --platform linux/amd64 \
        -f "${dockerfile}" \
        -t "${full_image}" \
        --push .
    
    echo -e "${GREEN}✓ Successfully built and pushed ${full_image}${NC}"
    echo ""
}

# Build and push API
build_and_push "api" "docker/Dockerfile.api"

# Build and push Worker
build_and_push "worker" "docker/Dockerfile.worker"

# Build and push Web SPA
build_and_push "web" "docker/Dockerfile.web"

echo -e "${GREEN}All images have been built and pushed successfully!${NC}"
echo ""
echo "Images pushed:"
echo "  - ${REGISTRY}/personal-kanban-api:${IMAGE_TAG}"
echo "  - ${REGISTRY}/personal-kanban-worker:${IMAGE_TAG}"
echo "  - ${REGISTRY}/personal-kanban-web:${IMAGE_TAG}"

