import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProjects } from '@/hooks/useProjects';
import type { Board, Project } from '@/services/types';
import { Edit, Folder, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProjectsManagementProps {
    board: Board;
    onProjectChange?: () => void;
}

export function ProjectsManagement({ board, onProjectChange }: ProjectsManagementProps) {
    const { projects, loading, createProject, updateProject, deleteProject } = useProjects(
        board.id,
    );
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        desiredOutcome: '',
        status: 'active',
    });
    const [saving, setSaving] = useState(false);

    const handleCreateClick = () => {
        setFormData({
            name: '',
            description: '',
            desiredOutcome: '',
            status: 'active',
        });
        setShowCreateDialog(true);
    };

    const handleEditClick = (project: Project) => {
        setSelectedProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
            desiredOutcome: project.desiredOutcome || '',
            status: project.status || 'active',
        });
        setShowEditDialog(true);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Project name is required');
            return;
        }

        setSaving(true);
        try {
            await createProject({
                boardId: board.id,
                ownerId: board.ownerId,
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                desiredOutcome: formData.desiredOutcome.trim() || undefined,
            });
            toast.success('Project created successfully');
            setShowCreateDialog(false);
            onProjectChange?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setSaving(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !formData.name.trim()) {
            toast.error('Project name is required');
            return;
        }

        setSaving(true);
        try {
            await updateProject(selectedProject.id, {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                desiredOutcome: formData.desiredOutcome.trim() || null,
                status: formData.status,
            });
            toast.success('Project updated successfully');
            setShowEditDialog(false);
            setSelectedProject(null);
            onProjectChange?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (project: Project) => {
        if (!confirm(`Are you sure you want to delete "${project.name}"?`)) {
            return;
        }

        try {
            await deleteProject(project.id);
            toast.success('Project deleted successfully');
            onProjectChange?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete project');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-slate-500">Loading projects...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 lg:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Projects</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage projects to organize your tasks
                    </p>
                </div>
                <Button onClick={handleCreateClick}>
                    <Plus className="size-4 mr-2" />
                    Create Project
                </Button>
            </div>

            {projects.length === 0 ? (
                <Card className="p-8 text-center">
                    <Folder className="size-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 font-medium mb-2">No projects yet</p>
                    <p className="text-slate-500 text-sm mb-4">
                        Create your first project to organize your tasks
                    </p>
                    <Button onClick={handleCreateClick}>
                        <Plus className="size-4 mr-2" />
                        Create Project
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => {
                        const taskCount = project.tasks?.length || 0;
                        return (
                            <Card key={project.id} className="p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3 flex-1">
                                        <Folder className="size-5 text-indigo-600 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">
                                                {project.name}
                                            </h3>
                                            {project.status && project.status !== 'active' && (
                                                <Badge variant="secondary" className="mt-1 text-xs">
                                                    {project.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8"
                                            onClick={() => handleEditClick(project)}
                                        >
                                            <Edit className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(project)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                {project.description && (
                                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                        {project.description}
                                    </p>
                                )}
                                {project.desiredOutcome && (
                                    <div className="mb-2">
                                        <p className="text-xs font-medium text-slate-500 mb-1">
                                            Desired Outcome:
                                        </p>
                                        <p className="text-sm text-slate-700 line-clamp-2">
                                            {project.desiredOutcome}
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                                    <span className="text-xs text-slate-500">
                                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Project Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Project</DialogTitle>
                        <DialogDescription>
                            Create a new project to organize your tasks
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Project name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Describe what this project is about"
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desiredOutcome">Desired Outcome</Label>
                                <Textarea
                                    id="desiredOutcome"
                                    value={formData.desiredOutcome}
                                    onChange={(e) =>
                                        setFormData({ ...formData, desiredOutcome: e.target.value })
                                    }
                                    placeholder="What does success look like for this project?"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreateDialog(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Creating...' : 'Create Project'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Project Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>Update project information</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">
                                    Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Project name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Describe what this project is about"
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-desiredOutcome">Desired Outcome</Label>
                                <Textarea
                                    id="edit-desiredOutcome"
                                    value={formData.desiredOutcome}
                                    onChange={(e) =>
                                        setFormData({ ...formData, desiredOutcome: e.target.value })
                                    }
                                    placeholder="What does success look like for this project?"
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger id="edit-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="on-hold">On Hold</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowEditDialog(false);
                                    setSelectedProject(null);
                                }}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

