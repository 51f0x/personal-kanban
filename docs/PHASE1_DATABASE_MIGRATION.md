# Phase 1: Database Separation Migration Guide

## Overview

This guide walks through the database separation migration for Phase 1. We're creating separate databases for API and Worker containers to follow the Single Responsibility Principle.

## Architecture Change

### Before
```
API Container ──┐
               ├──→ Single Database (kanban)
Worker Container ─┘
```

### After
```
API Container ──→ API Database (kanban_api)
Worker Container ──→ Worker Database (kanban_worker)
```

## Step-by-Step Migration

### Step 1: Backup Existing Database

**⚠️ CRITICAL: Backup before migration!**

```bash
# Backup the existing database
docker-compose exec postgres pg_dump -U kanban kanban > backup_$(date +%Y%m%d_%H%M%S).sql

# Or if using a different setup:
pg_dump -U kanban -d kanban > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Update Docker Compose

The `docker-compose.yml` has been updated to:
- Create `postgres-api` service with `kanban_api` database
- Create `postgres-worker` service with `kanban_worker` database
- Update API container to use `postgres-api`
- Update Worker container to use `postgres-worker`

### Step 3: Stop Existing Services

```bash
# Stop all services
docker-compose down

# Remove old volumes if you want a clean start (⚠️ This deletes data!)
# docker-compose down -v
```

### Step 4: Start New Database Services

```bash
# Start only the database services first
docker-compose up -d postgres-api postgres-worker

# Wait for both to be healthy
docker-compose ps
```

### Step 5: Run Migrations

#### For API Database

```bash
# Set API database URL
export DATABASE_URL=postgresql://kanban_api:kanban_api@localhost:5432/kanban_api

# Run Prisma migrations
npx prisma migrate deploy

# Or if you need to create a new migration:
npx prisma migrate dev --name init_api_database
```

#### For Worker Database

**Note:** For Phase 1, Worker database will have the same schema as API. In Phase 2, we'll create a worker-specific schema.

```bash
# Set Worker database URL
export DATABASE_URL=postgresql://kanban_worker:kanban_worker@localhost:5433/kanban_worker

# Run Prisma migrations
npx prisma migrate deploy

# Or if you need to create a new migration:
npx prisma migrate dev --name init_worker_database
```

### Step 6: Migrate Existing Data

#### Option A: Fresh Start (Development)

If you're okay with losing existing data (development environment):

```bash
# Just run migrations - databases will be empty
# This is fine for development
```

#### Option B: Migrate Existing Data (Production/Staging)

If you need to preserve existing data:

```bash
# 1. Restore backup to API database (contains all domain data)
psql -U kanban_api -d kanban_api -h localhost -p 5432 < backup_YYYYMMDD_HHMMSS.sql

# 2. For Worker database, we'll only migrate worker-specific data later
# For now, Worker database can be empty or have the same schema
# In Phase 2, we'll implement event-driven communication and proper data separation
```

### Step 7: Update Environment Variables

Update your `.env` file or environment variables:

```bash
# API Database
API_DATABASE_URL=postgresql://kanban_api:kanban_api@postgres-api:5432/kanban_api

# Worker Database  
WORKER_DATABASE_URL=postgresql://kanban_worker:kanban_worker@postgres-worker:5432/kanban_worker
```

The containers will use these via `DATABASE_URL` environment variable set in docker-compose.yml.

### Step 8: Start All Services

```bash
# Start all services
docker-compose up -d

# Check logs to ensure both containers connect to their databases
docker-compose logs api | grep -i database
docker-compose logs worker | grep -i database
```

### Step 9: Verify Separation

```bash
# Connect to API database
docker-compose exec postgres-api psql -U kanban_api -d kanban_api
# Run: \dt (list tables)

# Connect to Worker database
docker-compose exec postgres-worker psql -U kanban_worker -d kanban_worker
# Run: \dt (list tables)

# Verify they're separate
```

## Current State (Phase 1)

### API Database
- **Owns:** All domain data (Users, Boards, Tasks, Projects, Tags, Rules, Columns, etc.)
- **Schema:** Full Prisma schema
- **Purpose:** Source of truth for all domain data

### Worker Database
- **Current:** Same schema as API (for compatibility during migration)
- **Future (Phase 2):** Will have worker-specific schema (AgentProcessingJob, AgentResult, HintDraft)
- **Purpose:** Will own processing data only

## Important Notes

### ⚠️ Temporary State

**For Phase 1, both databases have the same schema.** This is intentional:
- Allows gradual migration
- Worker can still function during transition
- In Phase 2, we'll implement event-driven communication and proper data separation

### Data Access During Phase 1

- **API Container:** Reads/writes to `kanban_api` database
- **Worker Container:** Currently reads/writes to `kanban_worker` database
- **Worker still needs task data:** For now, Worker may need to read from API database via events (Phase 2) or temporary API endpoints

### Next Steps (Phase 2)

1. Create worker-specific Prisma schema
2. Implement event-driven communication
3. Worker subscribes to API events for task data
4. Worker writes results to worker database
5. API syncs hints from worker via events

## Troubleshooting

### Issue: Connection Refused

```bash
# Check if databases are running
docker-compose ps postgres-api postgres-worker

# Check database logs
docker-compose logs postgres-api
docker-compose logs postgres-worker

# Verify health checks
docker-compose exec postgres-api pg_isready -U kanban_api
docker-compose exec postgres-worker pg_isready -U kanban_worker
```

### Issue: Migration Fails

```bash
# Reset database (⚠️ Deletes data!)
docker-compose down -v
docker-compose up -d postgres-api postgres-worker

# Run migrations again
export DATABASE_URL=postgresql://kanban_api:kanban_api@localhost:5432/kanban_api
npx prisma migrate deploy
```

### Issue: Worker Can't Access Task Data

**This is expected in Phase 1!** Worker database is separate, so Worker can't directly access tasks. 

**Temporary Solutions:**
1. Worker reads from API database temporarily (not ideal, but works)
2. Wait for Phase 2 event-driven communication

**For Phase 1, we can temporarily allow Worker to read from API database:**
- Add `API_DATABASE_URL` to Worker environment
- Create a separate PrismaService for API database reads in Worker
- This is a temporary measure until Phase 2

## Rollback Plan

If you need to rollback:

```bash
# 1. Stop services
docker-compose down

# 2. Restore original docker-compose.yml (from git)
git checkout docker-compose.yml

# 3. Restore database backup
docker-compose up -d postgres
psql -U kanban -d kanban < backup_YYYYMMDD_HHMMSS.sql

# 4. Start services
docker-compose up -d
```

## Success Criteria

- [ ] Two separate databases created (`kanban_api` and `kanban_worker`)
- [ ] API container connects to `kanban_api`
- [ ] Worker container connects to `kanban_worker`
- [ ] Both databases have schema applied
- [ ] API can read/write to its database
- [ ] Worker can read/write to its database
- [ ] No shared database connection

## Next Phase

Once Phase 1 is complete, proceed to **Phase 2: Repository Pattern & Domain Events** where we'll:
- Implement event-driven communication
- Create worker-specific schema
- Properly separate data ownership
