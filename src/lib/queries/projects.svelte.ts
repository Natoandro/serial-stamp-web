import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { getProject, listProjects, updateProject, deleteProject } from '$lib/data/projects';
import type { Project } from '$lib/types';

// Query keys
export const projectKeys = {
	all: ['projects'] as const,
	lists: () => [...projectKeys.all, 'list'] as const,
	list: () => [...projectKeys.lists()] as const,
	details: () => [...projectKeys.all, 'detail'] as const,
	detail: (id: string) => [...projectKeys.details(), id] as const
};

// Get single project
export function useProjectQuery(projectId: string | null | undefined) {
	return createQuery(() => ({
		queryKey: projectKeys.detail(projectId || ''),
		queryFn: async () => {
			if (!projectId) return null;
			const project = await getProject(projectId);
			if (!project) {
				throw new Error('Project not found');
			}
			return project;
		},
		enabled: !!projectId
	}));
}

// List all projects
export function useProjectsQuery() {
	return createQuery(() => ({
		queryKey: projectKeys.list(),
		queryFn: listProjects
	}));
}

// Update project mutation
export function useUpdateProjectMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: async ({
			id,
			data
		}: {
			id: string;
			data: Partial<Omit<Project, 'id' | 'createdAt'>>;
		}) => {
			await updateProject(id, data);
			return id;
		},
		onSuccess: (id: string) => {
			// Invalidate and refetch
			queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: projectKeys.list() });
		}
	}));
}

// Delete project mutation
export function useDeleteProjectMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: deleteProject,
		onSuccess: () => {
			// Invalidate list query
			queryClient.invalidateQueries({ queryKey: projectKeys.list() });
		}
	}));
}
