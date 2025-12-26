import { useCallback, useEffect, useState } from 'react';
import {
    createProject as createProjectApi,
    deleteProject as deleteProjectApi,
    fetchProjects,
    updateProject as updateProjectApi,
} from '../services/projects';
import type { Project } from '../services/types';

export function useProjects(boardId: string | null) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadProjects = useCallback(async () => {
        if (!boardId) {
            setProjects([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchProjects(boardId);
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const createProject = useCallback(
        async (payload: Parameters<typeof createProjectApi>[0]) => {
            try {
                const newProject = await createProjectApi(payload);
                setProjects((prev) => [...prev, newProject]);
                return newProject;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create project');
                throw err;
            }
        },
        [],
    );

    const updateProject = useCallback(
        async (projectId: string, payload: Parameters<typeof updateProjectApi>[1]) => {
            try {
                const updatedProject = await updateProjectApi(projectId, payload);
                setProjects((prev) =>
                    prev.map((p) => (p.id === projectId ? updatedProject : p)),
                );
                return updatedProject;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update project');
                throw err;
            }
        },
        [],
    );

    const deleteProject = useCallback(async (projectId: string) => {
        try {
            await deleteProjectApi(projectId);
            setProjects((prev) => prev.filter((p) => p.id !== projectId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete project');
            throw err;
        }
    }, []);

    return {
        projects,
        loading,
        error,
        loadProjects,
        createProject,
        updateProject,
        deleteProject,
    };
}

