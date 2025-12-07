#!/bin/bash

# Database Migration Script for Phase 1: Database Separation
# This script helps migrate from a single database to separate API and Worker databases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Phase 1: Database Separation Migration${NC}"
echo "=========================================="
echo ""

# Check if docker-compose is running
if ! docker-compose ps | grep -q postgres-api; then
    echo -e "${RED}Error: postgres-api service is not running${NC}"
    echo "Please start services with: docker-compose up -d postgres-api postgres-worker"
    exit 1
fi

if ! docker-compose ps | grep -q postgres-worker; then
    echo -e "${RED}Error: postgres-worker service is not running${NC}"
    echo "Please start services with: docker-compose up -d postgres-api postgres-worker"
    exit 1
fi

# Function to check database connection
check_db_connection() {
    local db_name=$1
    local db_user=$2
    local db_host=$3
    local db_port=$4
    
    echo -e "${YELLOW}Checking connection to ${db_name}...${NC}"
    if docker-compose exec -T postgres-$db_host psql -U $db_user -d $db_name -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected to ${db_name}${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to connect to ${db_name}${NC}"
        return 1
    fi
}

# Check API database connection
if ! check_db_connection "kanban_api" "kanban_api" "api" "5432"; then
    exit 1
fi

# Check Worker database connection
if ! check_db_connection "kanban_worker" "kanban_worker" "worker" "5432"; then
    exit 1
fi

echo ""
echo -e "${GREEN}Both databases are accessible!${NC}"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Run Prisma migrations on both databases"
echo "2) Backup existing database (if migrating from old setup)"
echo "3) Restore backup to API database"
echo "4) Check database status"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Running Prisma migrations...${NC}"
        echo ""
        
        # API Database
        echo -e "${YELLOW}Migrating API database...${NC}"
        # Try to get DATABASE_URL from .env file, or use docker-compose service name
        if [ -f .env ] && grep -q "API_DATABASE_URL" .env; then
            # Extract API_DATABASE_URL from .env file
            API_DB_URL=$(grep "^API_DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
            export DATABASE_URL="$API_DB_URL"
        else
            # Fallback: try docker-compose service name (works inside docker network)
            export DATABASE_URL="postgresql://kanban_api:kanban_api@postgres-api:5432/kanban_api"
        fi
        echo "Using DATABASE_URL: ${DATABASE_URL}"
        npx prisma migrate deploy || {
            echo -e "${RED}API database migration failed${NC}"
            echo "Trying alternative connection method..."
            # Try localhost if docker service name doesn't work
            export DATABASE_URL="postgresql://kanban_api:kanban_api@localhost:5432/kanban_api"
            npx prisma migrate deploy || {
                echo -e "${RED}API database migration failed with both methods${NC}"
                exit 1
            }
        }
        echo -e "${GREEN}✓ API database migrated${NC}"
        echo ""
        
        # Worker Database
        echo -e "${YELLOW}Migrating Worker database...${NC}"
        # Try to get DATABASE_URL from .env file, or use docker-compose service name
        if [ -f .env ] && grep -q "WORKER_DATABASE_URL" .env; then
            # Extract WORKER_DATABASE_URL from .env file
            WORKER_DB_URL=$(grep "^WORKER_DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
            export DATABASE_URL="$WORKER_DB_URL"
        else
            # Fallback: try docker-compose service name (works inside docker network)
            export DATABASE_URL="postgresql://kanban_worker:kanban_worker@postgres-worker:5432/kanban_worker"
        fi
        echo "Using DATABASE_URL: ${DATABASE_URL}"
        npx prisma migrate deploy || {
            echo -e "${RED}Worker database migration failed${NC}"
            echo "Trying alternative connection method..."
            # Try localhost if docker service name doesn't work
            export DATABASE_URL="postgresql://kanban_worker:kanban_worker@localhost:5433/kanban_worker"
            npx prisma migrate deploy || {
                echo -e "${RED}Worker database migration failed with both methods${NC}"
                exit 1
            }
        }
        echo -e "${GREEN}✓ Worker database migrated${NC}"
        echo ""
        
        echo -e "${GREEN}✓ All migrations completed successfully!${NC}"
        ;;
        
    2)
        echo ""
        read -p "Enter backup filename (default: backup_$(date +%Y%m%d_%H%M%S).sql): " backup_file
        backup_file=${backup_file:-backup_$(date +%Y%m%d_%H%M%S).sql}
        
        echo -e "${YELLOW}Creating backup...${NC}"
        # Check if old postgres service exists
        if docker-compose ps | grep -q "postgres "; then
            docker-compose exec -T postgres pg_dump -U kanban kanban > "$backup_file"
            echo -e "${GREEN}✓ Backup created: ${backup_file}${NC}"
        else
            echo -e "${YELLOW}Old postgres service not found. Skipping backup.${NC}"
        fi
        ;;
        
    3)
        echo ""
        read -p "Enter backup file path: " backup_file
        
        if [ ! -f "$backup_file" ]; then
            echo -e "${RED}Error: Backup file not found: ${backup_file}${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}Restoring backup to API database...${NC}"
        echo -e "${YELLOW}⚠️  This will overwrite existing data in API database!${NC}"
        read -p "Are you sure? [y/N]: " confirm
        
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "Cancelled."
            exit 0
        fi
        
        docker-compose exec -T postgres-api psql -U kanban_api -d kanban_api < "$backup_file" || {
            echo -e "${RED}Restore failed${NC}"
            exit 1
        }
        
        echo -e "${GREEN}✓ Backup restored to API database${NC}"
        ;;
        
    4)
        echo ""
        echo -e "${YELLOW}Database Status:${NC}"
        echo ""
        
        # API Database
        echo "API Database (kanban_api):"
        docker-compose exec -T postgres-api psql -U kanban_api -d kanban_api -c "\dt" 2>/dev/null | head -20 || echo "  (No tables or connection error)"
        echo ""
        
        # Worker Database
        echo "Worker Database (kanban_worker):"
        docker-compose exec -T postgres-worker psql -U kanban_worker -d kanban_worker -c "\dt" 2>/dev/null | head -20 || echo "  (No tables or connection error)"
        echo ""
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
