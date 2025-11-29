import { useState, useEffect, FormEvent } from 'react';
import { Task, TaskContext, Board, Project, Column } from '../api/types';
import { updateTask, fetchTaskById, moveTask, deleteTask } from '../api/tasks';
import { HintsPanel } from './HintsPanel';

interface TaskDetailModalProps {
  taskId: string;
  board: Board;
  onClose: () => void;
  onUpdate: () => void;
}

const TASK_CONTEXTS: TaskContext[] = ['EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER'];

const contextLabels: Record<TaskContext, string> = {
  EMAIL: '📧 Email',
  MEETING: '👥 Meeting',
  PHONE: '📞 Phone',
  READ: '📖 Read',
  WATCH: '🎬 Watch',
  DESK: '💻 Desk',
  OTHER: '📌 Other',
};

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

function formatDateTimeDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Not set';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

export function TaskDetailModal({ taskId, board, onClose, onUpdate }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState<TaskContext | ''>('');
  const [projectId, setProjectId] = useState<string | ''>('');
  const [columnId, setColumnId] = useState<string>('');
  const [waitingFor, setWaitingFor] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [needsBreakdown, setNeedsBreakdown] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    fetchTaskById(taskId)
      .then((data) => {
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setContext(data.context || '');
        setProjectId(data.projectId || '');
        setColumnId(data.columnId);
        setWaitingFor(data.waitingFor || '');
        setDueAt(data.dueAt ? formatDateTime(data.dueAt) : '');
        setNeedsBreakdown(data.needsBreakdown);
        setIsDone(data.isDone);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load task');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [taskId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setSaving(true);
    setError(null);

    try {
      const columnChanged = columnId !== task.columnId;
      
      // Handle column change separately with WIP validation
      if (columnChanged) {
        try {
          await moveTask(task.id, columnId, false);
        } catch (moveErr) {
          setError(moveErr instanceof Error ? moveErr.message : 'Failed to move task - WIP limit may be exceeded');
          setSaving(false);
          return;
        }
      }

      // Update other fields
      const updates: any = {
        title,
        description: description || null,
        context: context || null,
        projectId: projectId || null,
        waitingFor: waitingFor || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        needsBreakdown,
        isDone,
      };

      // Remove undefined values
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) delete updates[key];
      });

      await updateTask(task.id, updates);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteTask(task.id);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="banner">Loading task...</div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="banner error">Task not found</div>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Task Details</h2>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="banner error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              disabled={saving}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="column">Column</label>
              <select
                id="column"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                disabled={saving}
              >
                {board.columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="context">Context</label>
              <select
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value as TaskContext | '')}
                disabled={saving}
              >
                <option value="">None</option>
                {TASK_CONTEXTS.map((ctx) => (
                  <option key={ctx} value={ctx}>
                    {contextLabels[ctx]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="project">Project</label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={saving}
              >
                <option value="">None</option>
                {(board.projects || []).map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dueAt">Due Date & Time</label>
              <input
                id="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                disabled={saving}
              />
              {dueAt && (
                <small className="form-hint">
                  {formatDateTimeDisplay(dueAt)}
                </small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="waitingFor">Waiting For</label>
            <input
              id="waitingFor"
              type="text"
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
              placeholder="e.g., John's response"
              disabled={saving}
            />
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={needsBreakdown}
                  onChange={(e) => setNeedsBreakdown(e.target.checked)}
                  disabled={saving}
                />
                Needs Breakdown
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) => setIsDone(e.target.checked)}
                  disabled={saving}
                />
                Done
              </label>
            </div>
          </div>

          {task.hints && task.hints.length > 0 && (
            <HintsPanel 
              hints={task.hints} 
              taskId={task.id}
              onUpdate={async () => {
                // Reload task to get updated hints
                try {
                  const updatedTask = await fetchTaskById(task.id);
                  setTask(updatedTask);
                  onUpdate();
                } catch (err) {
                  console.error('Failed to reload task:', err);
                }
              }}
            />
          )}

          <div className="task-meta-info">
            <div className="meta-item">
              <strong>Created:</strong> {formatDateTimeDisplay(task.createdAt)}
            </div>
            <div className="meta-item">
              <strong>Last Updated:</strong> {formatDateTimeDisplay(task.updatedAt)}
            </div>
            <div className="meta-item">
              <strong>Last Moved:</strong> {formatDateTimeDisplay(task.lastMovedAt)}
            </div>
            {task.completedAt && (
              <div className="meta-item">
                <strong>Completed:</strong> {formatDateTimeDisplay(task.completedAt)}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="delete-btn"
              onClick={handleDelete} 
              disabled={saving || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Task'}
            </button>
            <div className="modal-actions-right">
              <button type="button" onClick={onClose} disabled={saving || deleting}>
                Cancel
              </button>
              <button type="submit" disabled={saving || deleting || !title.trim()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

