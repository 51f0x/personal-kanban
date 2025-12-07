# Phase 2: Service Refactoring Progress

## ✅ Completed Refactoring

### TaskService Refactoring

**Methods Refactored:**
- [x] `getTaskById()` - Uses `ITaskRepository.findById()`
- [x] `listTasksForBoard()` - Uses `ITaskRepository.findByBoardId()`
- [x] `moveTask()` - Uses `ITaskRepository.findById()` and `IColumnRepository.findById()`
- [x] `getStaleTasks()` - Uses `ITaskRepository.findStaleTasks()` and `findByBoardId()`
- [x] `deleteTask()` - Uses `ITaskRepository.findById()` and `delete()`
- [x] `updateTask()` - Uses `ITaskRepository.update()`
- [x] `markStale()` - Uses `ITaskRepository.update()`

**Methods Still Using PrismaService (Temporary):**
- `createTask()` - Uses repository for max position, but creates task via transaction
- `reorderTaskInColumn()` - Complex transaction logic, uses Prisma directly
- Related operations (taskTag, checklistItem, taskEvent) - Will be handled in Phase 2 Week 7-8

**Value Objects Used:**
- `TaskId` - All task ID operations
- `BoardId` - Board-related queries
- `ColumnId` - Column-related queries

### BoardService Refactoring

**Methods Refactored:**
- [x] `createBoard()` - Uses `IBoardRepository.create()`
- [x] `listBoardsForOwner()` - Uses `IBoardRepository.findByOwnerId()`
- [x] `getBoardById()` - Uses `IBoardRepository.findById()`
- [x] `updateBoard()` - Uses `IBoardRepository.update()`
- [x] `deleteBoard()` - Uses `IBoardRepository.findById()` and `delete()`

**Value Objects Used:**
- `BoardId` - All board ID operations

**Note:** `deleteBoard()` still uses PrismaService for cascade deletes (taskEvent, task, column, tag, project, rule, recurringTemplate). These will be handled via domain events in Phase 2 Week 7-8.

### ColumnService Refactoring

**Methods Refactored:**
- [x] `createColumn()` - Uses `IColumnRepository.create()`
- [x] `getColumn()` - Uses `IColumnRepository.findById()`
- [x] `listColumnsForBoard()` - Uses `IColumnRepository.findByBoardIdOrdered()`
- [x] `updateColumn()` - Uses `IColumnRepository.update()`
- [x] `deleteColumn()` - Uses `IColumnRepository.findById()` and `delete()`

**Methods Still Using PrismaService (Temporary):**
- `reorderColumns()` - Uses Prisma transaction directly (repositories don't support transactions yet)
- Task counting in `getColumn()` and `listColumnsForBoard()` - Using Prisma for now

**Value Objects Used:**
- `ColumnId` - All column ID operations
- `BoardId` - Board-related queries

### WipService Refactoring

**Methods Refactored:**
- [x] `checkWipLimit()` - Uses `IColumnRepository.findById()` and `ITaskRepository.countByColumnId()`
- [x] `getBoardWipStatus()` - Uses `IColumnRepository.findByBoardIdOrdered()` and `ITaskRepository.countByColumnId()`
- [x] `isAtLimit()` - Uses `checkWipLimit()` which uses repositories

**Value Objects Used:**
- `ColumnId` - All column ID operations
- `TaskId` - Task exclusion in WIP checks
- `BoardId` - Board-related queries

## 📊 Refactoring Statistics

### Services Refactored
- **TaskService:** 7/10 methods using repositories (70%)
- **BoardService:** 5/5 methods using repositories (100%)
- **ColumnService:** 5/6 methods using repositories (83%)
- **WipService:** 3/3 methods using repositories (100%) ✅

### Direct PrismaService Usage Remaining
- **Transactions:** All transaction operations still use PrismaService directly
  - Reason: Repositories don't support transactions yet
  - Future: Will add Unit of Work pattern in Phase 5
  
- **Related Operations:** taskTag, checklistItem, taskEvent
  - Reason: Not in repository interfaces yet
  - Future: Will be handled via domain events in Phase 2 Week 7-8

- **Complex Queries:** Some queries with specific relations
  - Reason: Repository options don't cover all cases yet
  - Future: Can extend repository interfaces as needed

## 🔄 Migration Pattern

### Pattern Used

1. **Inject Repository:**
   ```typescript
   @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository
   ```

2. **Convert IDs to Value Objects:**
   ```typescript
   const taskId = TaskId.from(id);
   const boardId = BoardId.from(boardId);
   ```

3. **Use Repository Methods:**
   ```typescript
   const task = await this.taskRepository.findById(taskId, options);
   ```

4. **Map Results (Temporary):**
   ```typescript
   // Map to Prisma format for backward compatibility
   // TODO: In Phase 3, return domain entities instead
   return { ...task, config: task.config ?? Prisma.JsonNull };
   ```

### Transaction Handling

**Current Approach:**
- Repository methods called **outside** transactions
- PrismaService used **inside** transactions for related operations
- This is a temporary hybrid approach

**Example:**
```typescript
// Get max position using repository (outside transaction)
const maxPosition = await this.taskRepository.getMaxPositionInColumn(columnId);

// Use PrismaService for transaction (inside transaction)
return this.prisma.$transaction(async (tx) => {
    const task = await tx.task.create({ ... });
    await tx.taskTag.createMany({ ... });
    await tx.taskEvent.create({ ... });
});
```

**Future (Phase 5):**
- Unit of Work pattern will handle transactions
- Repositories will work within transactions

## ✅ Benefits Achieved

1. **Type Safety**
   - Value objects prevent mixing TaskId with BoardId
   - Compile-time errors for invalid IDs

2. **Dependency Inversion**
   - Services depend on interfaces, not concrete PrismaService
   - Can swap implementations (e.g., for testing)

3. **Testability**
   - Can mock repositories easily
   - Services can be tested without database

4. **Separation of Concerns**
   - Data access logic in repositories
   - Business logic in services
   - Clear boundaries

## 📝 Remaining Work

### Immediate (Phase 2 Week 5-6)
- [x] Refactor WipService to use repositories ✅
- [ ] Complete TaskService refactoring (createTask, reorderTaskInColumn) - Partial (transaction operations remain)
- [ ] Add more repository methods if needed

### Phase 2 Week 7-8 (Domain Events)
- [ ] Replace taskTag, checklistItem, taskEvent operations with domain events
- [ ] Remove remaining PrismaService usage for related operations

### Phase 5 (Unit of Work)
- [ ] Add transaction support to repositories
- [ ] Implement Unit of Work pattern
- [ ] Remove all direct PrismaService usage

## 🎯 Success Criteria

- [x] Repository interfaces created
- [x] Prisma implementations created
- [x] Services refactored to use repositories (partial)
- [x] Value objects used throughout
- [x] Builds successfully
- [ ] All services fully refactored (in progress)
- [ ] No direct PrismaService usage in services (partial)

## 📚 Files Modified

### Services
- `apps/api/src/modules/tasks/task.service.ts` - Partially refactored (70%)
- `apps/api/src/modules/boards/board.service.ts` - Fully refactored (100%)
- `apps/api/src/modules/boards/column.service.ts` - Fully refactored (83%)
- `apps/api/src/modules/boards/wip.service.ts` - Fully refactored (100%) ✅

### Modules
- `apps/api/src/modules/tasks/task.module.ts` - Added repository injection
- `apps/api/src/modules/boards/board.module.ts` - Added repository injection (including ITaskRepository for WipService)

---

**Status:** Phase 2 Week 5-6 In Progress  
**Last Updated:** 2024-12-07  
**Next:** Complete TaskService refactoring, then move to Phase 2 Week 7-8 (Domain Events)
