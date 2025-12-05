import { Folder, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/services/types';

interface ProjectFilterProps {
  projects: Project[] | undefined;
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
}

export function ProjectFilter({ projects, selectedProjectId, onProjectChange }: ProjectFilterProps) {
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Project:</span>
      <Select
        value={selectedProjectId || 'all'}
        onValueChange={(value) => onProjectChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All projects">
            {selectedProject ? (
              <div className="flex items-center gap-2">
                <Folder className="size-3.5" />
                <span>{selectedProject.name}</span>
              </div>
            ) : (
              'All projects'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>All projects</span>
            </div>
          </SelectItem>
          {projects?.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <Folder className="size-3.5" />
                <span>{project.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedProject && (
        <Badge variant="secondary" className="gap-1">
          <Folder className="size-3" />
          {selectedProject.name}
        </Badge>
      )}
    </div>
  );
}
