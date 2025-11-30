import { useState, useEffect, FormEvent } from 'react';
import { Task, TaskContext, Board, Project, Column } from '../../services/types';
import { updateTask, fetchTaskById, moveTask, deleteTask } from '../../services/tasks';
import { HintsPanel } from '../capture/HintsPanel';
import { Input } from '@/components/base/input/input';
import { TextArea } from '@/components/base/textarea/textarea';
import { NativeSelect } from '@/components/base/select/select-native';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Button } from '@/components/base/buttons/button';

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
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in" onClick={onClose}>
        <div className="bg-gray-800/95 border border-gray-700/30 rounded-2xl shadow-xl max-w-[90vw] max-h-[90vh] overflow-y-auto animate-in slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 text-sm">Loading task...</div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in" onClick={onClose}>
        <div className="bg-gray-800/95 border border-gray-700/30 rounded-2xl shadow-xl max-w-[90vw] max-h-[90vh] overflow-y-auto animate-in slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">Task not found</div>
          <button type="button" onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-gray-700/50 text-gray-300 text-sm font-medium border border-gray-600/30 transition-all duration-250 hover:bg-gray-700/70">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-gray-800/95 border border-gray-700/30 rounded-2xl shadow-xl min-w-[600px] max-w-[800px] max-h-[90vh] overflow-y-auto animate-in slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700/30 px-8 pt-8">
          <h2 className="text-2xl font-semibold text-white m-0">Task Details</h2>
          <button
            type="button"
            className="bg-transparent border-none text-gray-400 text-2xl leading-none p-0 w-8 h-8 flex items-center justify-center cursor-pointer rounded transition-all duration-250 hover:bg-blue-500/10 hover:text-blue-400 hover:scale-110"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mx-8 mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-8 pb-8">
          <Input
            label="Title"
            value={title}
            onChange={(value: string) => setTitle(value)}
            required
            isDisabled={saving}
            size="sm"
          />

          <TextArea
            label="Description"
            value={description}
            onChange={(value: string) => setDescription(value)}
            rows={6}
            isDisabled={saving}
          />

          <div className="grid grid-cols-2 gap-4">
            <NativeSelect
              label="Column"
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              disabled={saving}
              options={board.columns.map((col) => ({
                label: `${col.name} (${col.type})`,
                value: col.id,
              }))}
            />

            <NativeSelect
              label="Context"
              value={context}
              onChange={(e) => setContext(e.target.value as TaskContext | '')}
              disabled={saving}
              options={[
                { label: 'None', value: '' },
                ...TASK_CONTEXTS.map((ctx) => ({
                  label: contextLabels[ctx],
                  value: ctx,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NativeSelect
              label="Project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={saving}
              options={[
                { label: 'None', value: '' },
                ...(board.projects || []).map((proj) => ({
                  label: proj.name,
                  value: proj.id,
                })),
              ]}
            />

            <Input
              label="Due Date & Time"
              type="datetime-local"
              value={dueAt}
              onChange={(value: string) => setDueAt(value)}
              isDisabled={saving}
              size="sm"
              hint={dueAt ? formatDateTimeDisplay(dueAt) : undefined}
            />
          </div>

          <Input
            label="Waiting For"
            value={waitingFor}
            onChange={(value: string) => setWaitingFor(value)}
            placeholder="e.g., John's response"
            isDisabled={saving}
            size="sm"
          />

          <div className="grid grid-cols-2 gap-4">
            <Checkbox
              size="sm"
              isSelected={needsBreakdown}
              onChange={(isSelected) => setNeedsBreakdown(isSelected)}
              isDisabled={saving}
              label="Needs Breakdown"
            />

            <Checkbox
              size="sm"
              isSelected={isDone}
              onChange={(isSelected) => setIsDone(isSelected)}
              isDisabled={saving}
              label="Done"
            />
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

          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/30 flex flex-col gap-2">
            <div className="text-sm text-gray-300">
              <strong className="text-white mr-2">Created:</strong> {formatDateTimeDisplay(task.createdAt)}
            </div>
            <div className="text-sm text-gray-300">
              <strong className="text-white mr-2">Last Updated:</strong> {formatDateTimeDisplay(task.updatedAt)}
            </div>
            <div className="text-sm text-gray-300">
              <strong className="text-white mr-2">Last Moved:</strong> {formatDateTimeDisplay(task.lastMovedAt)}
            </div>
            {task.completedAt && (
              <div className="text-sm text-gray-300">
                <strong className="text-white mr-2">Completed:</strong> {formatDateTimeDisplay(task.completedAt)}
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-between items-center pt-4 border-t border-gray-700/30">
            <Button
              size="sm"
              color="secondary-destructive"
              onClick={handleDelete}
              isDisabled={saving || deleting}
              isLoading={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Task'}
            </Button>
            <div className="flex gap-4">
              <Button
                size="sm"
                color="secondary"
                onClick={onClose}
                isDisabled={saving || deleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                color="primary"
                isDisabled={saving || deleting || !title.trim()}
                isLoading={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

