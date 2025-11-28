import { TaskContext, ColumnType, Project } from '../api/types';

export interface Filters {
  context: TaskContext | null;
  columnType: ColumnType | null;
  projectId: string | null;
  showStale: boolean;
  showDone: boolean;
  searchQuery: string;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  projects: Project[];
}

const contexts: Array<{ value: TaskContext; label: string; icon: string }> = [
  { value: 'EMAIL', label: 'Email', icon: '✉️' },
  { value: 'MEETING', label: 'Meeting', icon: '👥' },
  { value: 'PHONE', label: 'Phone', icon: '📞' },
  { value: 'READ', label: 'Read', icon: '📖' },
  { value: 'WATCH', label: 'Watch', icon: '🎬' },
  { value: 'DESK', label: 'Desk', icon: '💻' },
  { value: 'OTHER', label: 'Other', icon: '📌' },
];

const columnTypes: Array<{ value: ColumnType; label: string; icon: string }> = [
  { value: 'INPUT', label: 'Inbox', icon: '📥' },
  { value: 'CLARIFY', label: 'Clarify', icon: '🎯' },
  { value: 'CONTEXT', label: 'Context', icon: '⚡' },
  { value: 'WAITING', label: 'Waiting', icon: '⏳' },
  { value: 'SOMEDAY', label: 'Someday', icon: '💭' },
  { value: 'DONE', label: 'Done', icon: '✅' },
];

export function FilterBar({ filters, onFiltersChange, projects }: FilterBarProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      context: null,
      columnType: null,
      projectId: null,
      showStale: false,
      showDone: true,
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.context !== null ||
    filters.columnType !== null ||
    filters.projectId !== null ||
    filters.showStale ||
    !filters.showDone ||
    filters.searchQuery !== '';

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="filter-search"
          />
        </div>

        <div className="filter-group">
          <label>Context</label>
          <div className="filter-buttons">
            {contexts.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                className={`filter-btn ${filters.context === value ? 'active' : ''}`}
                onClick={() => updateFilter('context', filters.context === value ? null : value)}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Column Type</label>
          <select
            value={filters.columnType || ''}
            onChange={(e) => updateFilter('columnType', (e.target.value || null) as ColumnType | null)}
          >
            <option value="">All columns</option>
            {columnTypes.map(({ value, label, icon }) => (
              <option key={value} value={value}>
                {icon} {label}
              </option>
            ))}
          </select>
        </div>

        {projects.length > 0 && (
          <div className="filter-group">
            <label>Project</label>
            <select
              value={filters.projectId || ''}
              onChange={(e) => updateFilter('projectId', e.target.value || null)}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  📁 {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="filter-row">
        <div className="filter-toggles">
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={filters.showStale}
              onChange={(e) => updateFilter('showStale', e.target.checked)}
            />
            <span>⚠️ Show only stale</span>
          </label>

          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={filters.showDone}
              onChange={(e) => updateFilter('showDone', e.target.checked)}
            />
            <span>✅ Show done</span>
          </label>
        </div>

        {hasActiveFilters && (
          <button type="button" className="clear-filters" onClick={clearFilters}>
            ✕ Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
