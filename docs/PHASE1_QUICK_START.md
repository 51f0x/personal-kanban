# Phase 1 Quick Start Guide

## Quick Migration Steps

### 1. Stop Existing Services
```bash
docker-compose down
```

### 2. Start New Databases
```bash
docker-compose up -d postgres-api postgres-worker
```

### 3. Wait for Databases to be Healthy
```bash
docker-compose ps
# Wait until both postgres-api and postgres-worker show "healthy"
```

### 4. Run Migrations

#### API Database
```bash
export DATABASE_URL=postgresql://kanban_api:kanban_api@localhost:5432/kanban_api
npx prisma migrate deploy
```

#### Worker Database
```bash
export DATABASE_URL=postgresql://kanban_worker:kanban_worker@localhost:5433/kanban_worker
npx prisma migrate deploy
```

### 5. Start All Services
```bash
docker-compose up -d
```

### 6. Verify
```bash
# Check API logs
docker-compose logs api | grep -i database

# Check Worker logs  
docker-compose logs worker | grep -i database

# Both should show successful connections
```

## Using the Migration Script

```bash
# Run the interactive migration script
./scripts/migrate-databases.sh

# Choose option 1 to run migrations on both databases
```

## Troubleshooting

### Databases Won't Start
```bash
# Check if ports are in use
lsof -i :5432  # API database
lsof -i :5433  # Worker database

# Check logs
docker-compose logs postgres-api
docker-compose logs postgres-worker
```

### Migration Fails
```bash
# Reset and try again
docker-compose down -v
docker-compose up -d postgres-api postgres-worker

# Wait for health checks, then retry migrations
```

### Worker Can't Access Tasks
**This is expected!** Worker now has a separate database.

**Temporary Solution (Phase 1):**
- Worker will need temporary access to API database for reading tasks
- This will be fixed in Phase 2 with event-driven communication

See `PHASE1_PROGRESS.md` for details on implementing temporary worker access.

## What Changed?

- ✅ Two separate databases (`kanban_api` and `kanban_worker`)
- ✅ API container connects to `kanban_api`
- ✅ Worker container connects to `kanban_worker`
- ✅ Separate data volumes for each database

## Next Steps

1. Test the setup
2. Verify application functionality
3. Proceed to Phase 1 Week 3-4: Shared Domain Package Foundation
