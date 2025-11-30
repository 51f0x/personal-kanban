import React from 'react';
import { TaskContext, ColumnType, Project } from '../../services/types';
import { Input } from '@/components/base/input/input';
import { NativeSelect } from '@/components/base/select/select-native';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';

export type ViewType = 'grid' | 'list' | 'column' | 'row';

export interface Filters {
  context: TaskContext | null;
  columnType: ColumnType | null;
  projectId: string | null;
  showStale: boolean;
  showDone: boolean;
  searchQuery: string;
  view?: ViewType;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  projects: Project[];
  view?: ViewType;
  onViewChange?: (view: ViewType) => void;
  onFilterClick?: () => void;
  onSortClick?: () => void;
  onExportClick?: () => void;
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

// Icon components
const GridIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ListIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const ColumnIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const RowIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const SortIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
);

const ExportIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export function FilterBar({ 
  filters, 
  onFiltersChange, 
  projects,
  view = 'list',
  onViewChange,
  onFilterClick,
  onSortClick,
  onExportClick,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = React.useState(false);

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
      view: filters.view,
    });
  };

  const hasActiveFilters =
    filters.context !== null ||
    filters.columnType !== null ||
    filters.projectId !== null ||
    filters.showStale ||
    !filters.showDone ||
    filters.searchQuery !== '';

  const currentView = view || filters.view || 'list';

  const handleViewChange = (newView: ViewType) => {
    onViewChange?.(newView);
    onFiltersChange({ ...filters, view: newView });
  };

  const handleFilterClick = () => {
    setShowFilters(!showFilters);
    onFilterClick?.();
  };

  const viewOptions: Array<{ value: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: 'grid', label: 'Grid View', icon: GridIcon },
    { value: 'list', label: 'List View', icon: ListIcon },
    { value: 'column', label: 'Column View', icon: ColumnIcon },
    { value: 'row', label: 'Row View', icon: RowIcon },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* Header Bar */}
      <div className="bg-primary-solid rounded-lg px-6 py-4 flex items-center justify-between">
        {/* View Options - Left Side */}
        <div className="flex items-center gap-2">
          {viewOptions.map(({ value, label, icon: Icon }) => {
            const isActive = currentView === value;
            return (
              <button
                key={value}
                onClick={() => handleViewChange(value)}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-secondary text-fg-brand-primary'
                    : 'text-fg-white hover:bg-tertiary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Controls - Right Side */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleFilterClick}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 relative ${
              hasActiveFilters
                ? 'bg-brand-solid text-fg-white hover:bg-brand-solid_hover'
                : 'text-fg-white hover:bg-tertiary'
            }`}
          >
            <FilterIcon className="w-4 h-4" />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-error-solid rounded-full"></span>
            )}
          </button>

          <button
            onClick={onSortClick}
            className="px-3 py-2 text-fg-white text-sm font-medium hover:bg-tertiary rounded-lg transition-colors flex items-center gap-2"
          >
            <SortIcon className="w-4 h-4" />
            <span>Sort</span>
          </button>

          <button
            onClick={onExportClick}
            className="px-4 py-2 bg-brand-solid text-fg-white text-sm font-medium rounded-lg hover:bg-brand-solid_hover transition-colors flex items-center gap-2"
          >
            <ExportIcon className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Filter Panel - Collapsible */}
      {showFilters && (
        <div className="bg-secondary border border-primary rounded-lg p-6 mt-2 flex flex-col gap-5 shadow-lg">
          <div className="flex flex-wrap gap-5 items-end">
            <div className="min-w-[200px]">
              <Input
                label="Search"
                placeholder="Search tasks..."
                value={filters.searchQuery}
                onChange={(value: string) => updateFilter('searchQuery', value)}
                size="sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wide text-fg-tertiary font-semibold">Context</label>
              <div className="flex gap-2">
                {contexts.map(({ value, label, icon }) => (
                  <Button
                    key={value}
                    size="sm"
                    color={filters.context === value ? "primary" : "secondary"}
                    onClick={() => updateFilter('context', filters.context === value ? null : value)}
                    title={label}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>

            <div className="min-w-[180px]">
              <NativeSelect
                label="Column Type"
                value={filters.columnType || ''}
                onChange={(e) => updateFilter('columnType', (e.target.value || null) as ColumnType | null)}
                options={[
                  { label: 'All columns', value: '' },
                  ...columnTypes.map(({ value, label, icon }) => ({
                    label: `${icon} ${label}`,
                    value,
                  })),
                ]}
              />
            </div>

            {projects.length > 0 && (
              <div className="min-w-[180px]">
                <NativeSelect
                  label="Project"
                  value={filters.projectId || ''}
                  onChange={(e) => updateFilter('projectId', e.target.value || null)}
                  options={[
                    { label: 'All projects', value: '' },
                    ...projects.map((project) => ({
                      label: `📁 ${project.name}`,
                      value: project.id,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          <div className="flex gap-6 flex-wrap items-center">
            <div className="flex gap-6 flex-wrap">
              <Checkbox
                size="sm"
                isSelected={filters.showStale}
                onChange={(isSelected) => updateFilter('showStale', isSelected)}
                label="⚠️ Show only stale"
              />

              <Checkbox
                size="sm"
                isSelected={filters.showDone}
                onChange={(isSelected) => updateFilter('showDone', isSelected)}
                label="✅ Show done"
              />
            </div>

            {hasActiveFilters && (
              <Button
                size="sm"
                color="secondary-destructive"
                onClick={clearFilters}
                className="ml-auto"
              >
                ✕ Clear filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
