import { useState } from 'react';
import { Hint } from '../api/types';
import { applyHint, dismissHint, deleteHint } from '../api/hints';

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
            <div className="hint-tags">
              {tags.map((tag, idx) => (
                <span key={idx} className="hint-tag">
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
            <ul className="hint-actions-list">
              {actions.map((action, idx) => (
                <li key={idx}>{action.description}</li>
              ))}
            </ul>
          );
        }
        return null;

      case 'project-hints':
        if (hint.data && typeof hint.data === 'object' && 'projects' in hint.data) {
          const projects = (hint.data as { projects?: string[] }).projects || [];
          return (
            <div className="hint-projects">
              {projects.map((project, idx) => (
                <span key={idx} className="hint-project">
                  {project}
                </span>
              ))}
            </div>
          );
        }
        return null;

      default:
        return hint.content ? (
          <div className="hint-content">{hint.content}</div>
        ) : null;
    }
  };

  const renderHint = (hint: Hint, showActions: boolean = true) => (
    <div
      key={hint.id}
      className={`hint-card ${hint.applied ? 'hint-applied' : ''}`}
    >
      <div className="hint-header">
        <div className="hint-type">
          <span className="hint-type-icon">
            {hintTypeLabels[hint.hintType] || '💡'} {hint.title || hintTypeLabels[hint.hintType]?.split(' ')[1] || hint.hintType}
          </span>
          {hint.confidence !== null && hint.confidence !== undefined && (
            <span className="hint-confidence">
              {Math.round(hint.confidence * 100)}% confidence
            </span>
          )}
        </div>
        <div className="hint-meta">
          <span className="hint-agent">{agentLabels[hint.agentId] || hint.agentId}</span>
        </div>
      </div>

      {renderHintContent(hint)}

      {showActions && !hint.applied && (
        <div className="hint-actions">
          <button
            type="button"
            className="hint-btn hint-apply"
            onClick={() => handleApply(hint.id)}
            disabled={applying === hint.id || dismissing === hint.id || deleting === hint.id}
          >
            {applying === hint.id ? 'Applying...' : 'Apply'}
          </button>
          <button
            type="button"
            className="hint-btn hint-dismiss"
            onClick={() => handleDismiss(hint.id)}
            disabled={applying === hint.id || dismissing === hint.id || deleting === hint.id}
          >
            {dismissing === hint.id ? 'Dismissing...' : 'Dismiss'}
          </button>
          <button
            type="button"
            className="hint-btn hint-delete"
            onClick={() => handleDelete(hint.id)}
            disabled={applying === hint.id || dismissing === hint.id || deleting === hint.id}
          >
            {deleting === hint.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}

      {hint.applied && (
        <div className="hint-status">
          <span className="hint-applied-badge">✓ Applied</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="hints-panel">
      <h3 className="hints-panel-title">AI Suggestions</h3>
      
      {unappliedHints.length > 0 && (
        <div className="hints-section">
          <h4 className="hints-section-title">Available Suggestions ({unappliedHints.length})</h4>
          <div className="hints-list">
            {unappliedHints.map((hint) => renderHint(hint, true))}
          </div>
        </div>
      )}

      {appliedHints.length > 0 && (
        <div className="hints-section hints-section-applied">
          <h4 className="hints-section-title">Applied Suggestions ({appliedHints.length})</h4>
          <div className="hints-list">
            {appliedHints.map((hint) => renderHint(hint, false))}
          </div>
        </div>
      )}
    </div>
  );
}

