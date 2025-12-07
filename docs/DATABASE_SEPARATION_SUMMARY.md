# Database Separation: Critical SOLID Violation

## The Core Issue

**API and Worker containers should NOT share the same database.**

This is a **fundamental violation of the Single Responsibility Principle** at the container level.

---

## Current State (WRONG)

```yaml
# Both containers access the SAME database
api:
  DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban

worker:
  DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban  # ❌ SAME!
```

**Problem:**
- No data ownership boundaries
- Creates a **distributed monolith**
- Violates SRP: Both containers share data responsibility
- Cannot scale or deploy independently

---

## Why This Violates SOLID

### Single Responsibility Principle (SRP)

**Each container should have ONE responsibility:**

- **API Container**: HTTP/WebSocket interface + **own domain data**
- **Worker Container**: Background processing + **own processing data**

**Current:** Both containers share data ownership → **Violates SRP**

---

## Recommended Solution

### Separate Databases with Clear Ownership

```
API Container → API Database
  - Owns: Users, Boards, Tasks, Projects, Tags, Rules (domain data)
  - Responsibility: Source of truth for all domain data

Worker Container → Worker Database  
  - Owns: Agent results, Processing jobs, Hints (processing data)
  - Responsibility: Background processing state

Communication → Event Bus
  - API publishes domain events
  - Worker subscribes to events, processes, publishes results
  - Worker results synced to API via events
```

---

## Data Ownership Matrix

| Data Type | API Database | Worker Database | How Worker Accesses |
|-----------|-------------|-----------------|---------------------|
| Users, Boards, Tasks | ✅ Owns | ❌ None | Via events (event-carried state) |
| Agent Results | ❌ None | ✅ Owns | Direct write |
| Hints | ✅ Synced | ✅ Creates | Worker creates → event → API syncs |

---

## Benefits

- ✅ **Clear ownership** - Each container owns its data
- ✅ **Independent scaling** - Scale databases separately
- ✅ **Independent deployment** - Deploy containers separately  
- ✅ **SRP compliance** - Single responsibility per container
- ✅ **True service separation** - Not a distributed monolith

---

## Migration Path

1. **Create separate databases** (API DB, Worker DB)
2. **Move worker-specific data** to worker database
3. **Replace direct DB access** with event-driven communication
4. **API owns domain data**, Worker owns processing data

---

## Full Analysis

See **[DATABASE_SEPARATION_ANALYSIS.md](./DATABASE_SEPARATION_ANALYSIS.md)** for:
- Detailed data access patterns
- Separation strategies
- Implementation examples
- Migration roadmap

---

**Key Insight:** From a Single Responsibility perspective, API and Worker should NOT own access to the same database. Separate concerns = separate databases.
