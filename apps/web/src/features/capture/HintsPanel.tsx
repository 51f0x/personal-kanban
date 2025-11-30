import { useState } from 'react';
import { Hint } from '../../services/types';
import { applyHint, dismissHint, deleteHint } from '../../services/hints';

interface HintsPanelProps {
  hints: Hint[];
  taskId: string;
  onUpdate: () => void;
}

const hintTypeLabels: Record<string, string> = {
  'web-content': '🌐 Web Content',
  'summary': '📝 Summary',
  'title': '📌 Title',
  'description': '📄 Description',
  'context': '📍 Context',
  'tags': '🏷️ Tags',
  'priority': '⚡ Priority',
  'duration': '⏱️ Duration',
  'project-hints': '📁 Projects',
  'actions': '✅ Actions',
};

const agentLabels: Record<string, string> = {
  'web-content-agent': 'Web Content Agent',
  'content-summarizer-agent': 'Content Summarizer',
  'task-analyzer-agent': 'Task Analyzer',
  'context-extractor-agent': 'Context Extractor',
  'action-extractor-agent': 'Action Extractor',
};

export function HintsPanel({ hints, taskId, onUpdate }: HintsPanelProps) {
  const [applying, setApplying] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!hints || hints.length === 0) {
    return null;
  }

  const unappliedHints = hints.filter((h) => !h.applied);
  const appliedHints = hints.filter((h) => h.applied);

  const handleApply = async (hintId: string) => {
    setApplying(hintId);
    try {
      await applyHint(hintId, false);
      onUpdate();
    } catch (error) {
      console.error('Failed to apply hint:', error);
      alert(error instanceof Error ? error.message : 'Failed to apply hint');
    } finally {
      setApplying(null);
    }
  };

  const handleDismiss = async (hintId: string) => {
    setDismissing(hintId);
    try {
      await dismissHint(hintId);
      onUpdate();
    } catch (error) {
      console.error('Failed to dismiss hint:', error);
      alert(error instanceof Error ? error.message : 'Failed to dismiss hint');
    } finally {
      setDismissing(null);
    }
  };

  const handleDelete = async (hintId: string) => {
    if (!confirm('Delete this hint permanently?')) return;

    setDeleting(hintId);
    try {
      await deleteHint(hintId);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete hint:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete hint');
    } finally {
      setDeleting(null);
    }
  };

  const renderHintContent = (hint: Hint) => {
    switch (hint.hintType) {
      case 'tags':
        if (hint.data && typeof hint.data === 'object' && 'tags' in hint.data) {
          const tags = (hint.data as { tags?: string[] }).tags || [];
          return (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, idx) => (
                <span key={idx} className="inline-block px-2 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          );
        }
        return null;

      case 'actions':
        if (hint.data && typeof hint.data === 'object' && 'actions' in hint.data) {
          const actions = (hint.data as { actions?: Array<{ description: string }> }).actions || [];
          return (
            <ul className="m-0 pl-5 text-gray-300 leading-relaxed list-disc">
              {actions.map((action, idx) => (
                <li key={idx} className="mb-2 last:mb-0">{action.description}</li>
              ))}
            </ul>
          );
        }
        return null;

      case 'project-hints':
        if (hint.data && typeof hint.data === 'object' && 'projects' in hint.data) {
          const projects = (hint.data as { projects?: string[] }).projects || [];
          return (
            <div className="flex flex-wrap gap-2 mb-3">
              {projects.map((project, idx) => (
                <span key={idx} className="inline-block px-2 py-1 bg-orange-500/15 text-orange-300 border border-orange-500/30 rounded text-xs">
                  {project}
                </span>
              ))}
            </div>
          );
        }
        return null;

      default:
        return hint.content ? (
          <div className="text-gray-300 leading-relaxed mb-3 whitespace-pre-wrap">{hint.content}</div>
        ) : null;
    }
  };

  const renderHint = (hint: Hint, showActions: boolean = true) => (
    <div
      key={hint.id}
      className={`bg-gray-800/85 border rounded-lg p-4 transition-all duration-250 ${hint.applied
          ? 'opacity-60 border-green-500 bg-green-500/5'
          : 'border-gray-700/30 hover:border-gray-600/50 hover:shadow-sm'
        }`}
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white text-sm">
            {hintTypeLabels[hint.hintType] || '💡'} {hint.title || hintTypeLabels[hint.hintType]?.split(' ')[1] || hint.hintType}
          </span>
          {hint.confidence !== null && hint.confidence !== undefined && (
            <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
              {Math.round(hint.confidence * 100)}% confidence
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-gray-400">{agentLabels[hint.agentId] || hint.agentId}</span>
        </div>
      </div>

      {renderHintContent(hint)}

      {showActions && !hint.applied && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/30 flex-wrap">
          <button
            type="button"
            className="px-4 py-2 rounded text-sm font-medium transition-all duration-250 bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/25 hover:border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleApply(hint.id)}
            disabled={applying === hint.id || dismissing === hint.id || deleting === hint.id}
          >
            {applying === hint.id ? 'Applying...' : 'Apply'}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded text-sm font-medium transition-all duration-250 bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/25 hover:border-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleDismiss(hint.id)}
            disabled={applying === hint.id || dismissing === hint.id || deleting === hint.id}
          >
            {dismissing === hint.id ? 'Dismissing...' : 'Dismiss'}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded text-sm font-medium transition-all duration-250 bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleDelete(hint.id)}
            disabled={applying === hint.id || dismissing === hint.id || deleting === hint.id}
          >
            {deleting === hint.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}

      {hint.applied && (
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
            ✓ Applied
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-6 p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl">
      <h3 className="m-0 mb-4 text-lg font-semibold text-white flex items-center gap-2">AI Suggestions</h3>

      {unappliedHints.length > 0 && (
        <div className="mb-6 last:mb-0">
          <h4 className="m-0 mb-3 text-sm font-medium text-gray-300 uppercase tracking-wide">
            Available Suggestions ({unappliedHints.length})
          </h4>
          <div className="flex flex-col gap-3">
            {unappliedHints.map((hint) => renderHint(hint, true))}
          </div>
        </div>
      )}

      {appliedHints.length > 0 && (
        <div className="mb-6 last:mb-0 opacity-70">
          <h4 className="m-0 mb-3 text-sm font-medium text-gray-300 uppercase tracking-wide">
            Applied Suggestions ({appliedHints.length})
          </h4>
          <div className="flex flex-col gap-3">
            {appliedHints.map((hint) => renderHint(hint, false))}
          </div>
        </div>
      )}
    </div>
  );
}

