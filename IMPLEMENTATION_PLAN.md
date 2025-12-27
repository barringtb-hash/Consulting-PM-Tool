# Implementation Plan: Subtasks During Task Creation + NOT_STARTED Status

## Overview

This plan covers two features:
1. **Add "NOT_STARTED" status** to TaskStatus enum
2. **Allow creating subtasks** when creating a new task

---

## Feature 1: Add NOT_STARTED Status

### Database Changes

**File:** `pmo/prisma/schema.prisma`

Update the `TaskStatus` enum (currently lines 36-41):

```prisma
enum TaskStatus {
  NOT_STARTED   // NEW - added as first status
  BACKLOG
  IN_PROGRESS
  BLOCKED
  DONE
}
```

**Migration Command:**
```bash
cd pmo
npx prisma migrate dev --name add-not-started-task-status
```

### Backend Changes

**File:** `pmo/apps/api/src/validation/task.schema.ts`
- No changes needed - uses `z.nativeEnum(TaskStatus)` which auto-updates from Prisma

### Frontend Changes

**File:** `pmo/apps/web/src/api/tasks.ts`

Update `TaskStatus` type and `TASK_STATUSES` array:
```typescript
export type TaskStatus = 'NOT_STARTED' | 'BACKLOG' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

export const TASK_STATUSES: TaskStatus[] = [
  'NOT_STARTED',  // NEW
  'BACKLOG',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
];

// Add badge variant for NOT_STARTED
export const STATUS_BADGE_VARIANTS: Record<TaskStatus, ...> = {
  NOT_STARTED: 'neutral',  // Gray badge
  BACKLOG: 'neutral',
  IN_PROGRESS: 'primary',
  BLOCKED: 'danger',
  DONE: 'success',
};
```

**File:** `pmo/apps/web/src/features/tasks/SubtaskList.tsx`

Update `getStatusBgColor()` to handle `NOT_STARTED`:
```typescript
// 'neutral' case already handles this - no changes needed
```

**File:** `pmo/apps/web/src/features/tasks/TaskFormModal.tsx`

Update default status (optional - based on preference):
```typescript
const initialFormValues: TaskFormValues = {
  // ...
  status: 'NOT_STARTED',  // Changed from 'BACKLOG'
  // ...
};
```

### Decision Required

**Q: Should NOT_STARTED be the new default status for new tasks?**
- Current default: `BACKLOG`
- If yes: Update `TaskFormModal.tsx` initial values
- If no: Keep `BACKLOG` as default, `NOT_STARTED` is just an option

---

## Feature 2: Create Subtasks During Task Creation

### Approach

**Two-phase creation in a single modal:**
1. User fills out parent task details
2. User adds subtasks (title + status) in a collapsible section
3. On submit:
   - Create parent task → get task ID
   - Create each subtask using the parent task ID
   - Show success/error

### Frontend Changes

**File:** `pmo/apps/web/src/features/tasks/TaskFormModal.tsx`

#### 1. Add state for pending subtasks

```typescript
interface PendingSubtask {
  id: string;        // Temporary ID for React key
  title: string;
  status: TaskStatus;
}

// In component:
const [pendingSubtasks, setPendingSubtasks] = useState<PendingSubtask[]>([]);
```

#### 2. Add subtask section UI

After the milestone select, add a collapsible subtasks section:
- "Add Subtasks" header with expand/collapse toggle
- List of pending subtasks with:
  - Title input
  - Status dropdown
  - Remove button
- "Add Subtask" button to add more rows

#### 3. Update props interface

```typescript
interface TaskFormModalProps {
  // ... existing props
  onSubmit: (values: TaskPayload) => Promise<{ id: number } | void>;  // Return task ID
  onCreateSubtasks?: (parentTaskId: number, subtasks: SubtaskPayload[]) => Promise<void>;
}
```

#### 4. Update submit handler

```typescript
const handleSubmit = async (event: React.FormEvent): Promise<void> => {
  event.preventDefault();
  if (!validate()) return;

  const payload: TaskPayload = { /* ... */ };

  // Step 1: Create parent task
  const result = await onSubmit(payload);

  // Step 2: Create subtasks if any
  if (result?.id && pendingSubtasks.length > 0 && onCreateSubtasks) {
    const subtaskPayloads = pendingSubtasks.map(s => ({
      title: s.title,
      status: s.status,
    }));
    await onCreateSubtasks(result.id, subtaskPayloads);
  }
};
```

**File:** `pmo/apps/web/src/features/projects/ProjectTasksTab.tsx` (or wherever TaskFormModal is used)

Update the `onSubmit` handler to return the created task:

```typescript
const handleCreateTask = async (payload: TaskPayload) => {
  const task = await createTask.mutateAsync(payload);
  return { id: task.id };  // Return task ID for subtask creation
};

const handleCreateSubtasks = async (parentTaskId: number, subtasks: SubtaskPayload[]) => {
  for (const subtask of subtasks) {
    await createSubtaskMutation.mutateAsync({ parentTaskId, ...subtask });
  }
};
```

### API Changes (Optional Enhancement)

If you want atomic creation (all-or-nothing), add a new endpoint:

**File:** `pmo/apps/api/src/routes/task.routes.ts`

```typescript
// POST /tasks/with-subtasks
router.post('/tasks/with-subtasks', async (req, res) => {
  // Validate task + subtasks array
  // Create in transaction: parent task → subtasks
  // Return { task, subtasks }
});
```

**Recommendation:** Start with the sequential approach (simpler), add atomic endpoint later if needed.

---

## Files to Modify

| File | Changes |
|------|---------|
| `pmo/prisma/schema.prisma` | Add `NOT_STARTED` to `TaskStatus` enum |
| `pmo/apps/web/src/api/tasks.ts` | Update `TaskStatus` type, `TASK_STATUSES`, `STATUS_BADGE_VARIANTS` |
| `pmo/apps/web/src/features/tasks/TaskFormModal.tsx` | Add subtasks section, update submit handler |
| `pmo/apps/web/src/features/projects/ProjectTasksTab.tsx` | Update onSubmit to return task ID, add subtask creation |
| `pmo/apps/web/src/components/TaskKanbanBoard.tsx` | Handle NOT_STARTED column (if using Kanban) |

---

## Implementation Order

1. **Phase 1: NOT_STARTED status** (simpler, no dependencies)
   - Database migration
   - Frontend type/constant updates
   - Test in UI

2. **Phase 2: Subtasks during creation** (builds on existing subtask system)
   - Add subtasks UI to TaskFormModal
   - Update submit flow
   - Test end-to-end

---

## Questions Before Starting

1. **Default status:** Should `NOT_STARTED` be the default for new tasks? (Currently `BACKLOG`)

2. **Subtask detail level:** When adding subtasks during task creation, should users be able to set:
   - Just title + status? (recommended - simple)
   - Full details (title, status, due date, description)? (more complex)

3. **Kanban board:** Should `NOT_STARTED` appear as a separate column on the Kanban board, or be grouped with `BACKLOG`?
