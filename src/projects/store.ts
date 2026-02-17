import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { type ProjectId, type ProjectListItem, type ProjectMeta, createProjectId } from './types'

interface ProjectsState {
  currentProject: ProjectMeta
  projects: ProjectListItem[]
  isLoading: boolean
}

interface ProjectsActions {
  setProjectName: (name: string) => void
  setProjectDescription: (description: string | undefined) => void
  touchUpdatedAt: () => void
  loadProject: (meta: ProjectMeta) => void
  resetToNew: () => void
  setProjects: (projects: ProjectListItem[]) => void
  addProject: (project: ProjectListItem) => void
  removeProject: (projectId: ProjectId) => void
  updateProject: (projectId: ProjectId, updates: Partial<ProjectListItem>) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export type ProjectsStore = ProjectsState & { actions: ProjectsActions }

const createNewProjectMeta = (): ProjectMeta => ({
  projectId: createProjectId(),
  name: 'My Project',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const CURRENT_VERSION = 1

const initialState: ProjectsState = {
  currentProject: createNewProjectMeta(),
  projects: [],
  isLoading: false
}

export const useProjectsStore = create<ProjectsStore>()(
  devtools(
    persist(
      set => ({
        ...initialState,

        actions: {
          setProjectName: name =>
            set(
              state => ({
                currentProject: {
                  ...state.currentProject,
                  name,
                  updatedAt: new Date().toISOString()
                }
              }),
              false,
              'projects/setProjectName'
            ),

          setProjectDescription: description =>
            set(
              state => ({
                currentProject: {
                  ...state.currentProject,
                  description,
                  updatedAt: new Date().toISOString()
                }
              }),
              false,
              'projects/setProjectDescription'
            ),

          touchUpdatedAt: () =>
            set(
              state => ({
                currentProject: {
                  ...state.currentProject,
                  updatedAt: new Date().toISOString()
                }
              }),
              false,
              'projects/touchUpdatedAt'
            ),

          loadProject: meta => set({ currentProject: meta }, false, 'projects/loadProject'),

          resetToNew: () => set({ currentProject: createNewProjectMeta() }, false, 'projects/resetToNew'),

          setProjects: projects => set({ projects }, false, 'projects/setProjects'),

          addProject: project =>
            set(
              state => ({
                projects: [...state.projects, project]
              }),
              false,
              'projects/addProject'
            ),

          removeProject: projectId =>
            set(
              state => ({
                projects: state.projects.filter(p => p.id !== projectId)
              }),
              false,
              'projects/removeProject'
            ),

          updateProject: (projectId, updates) =>
            set(
              state => ({
                projects: state.projects.map(p => (p.id === projectId ? { ...p, ...updates } : p))
              }),
              false,
              'projects/updateProject'
            ),

          setLoading: isLoading => set({ isLoading }, false, 'projects/setLoading'),

          reset: () => set(initialState, false, 'projects/reset')
        }
      }),
      {
        name: 'strawbaler-project-meta',
        version: CURRENT_VERSION,
        partialize: state => ({
          currentProject: state.currentProject
        })
      }
    ),
    { name: 'projects-store' }
  )
)

export const useCurrentProject = () => useProjectsStore(state => state.currentProject)
export const useProjectId = () => useProjectsStore(state => state.currentProject.projectId)
export const useProjectName = () => useProjectsStore(state => state.currentProject.name)
export const useProjectDescription = () => useProjectsStore(state => state.currentProject.description)
export const useProjectList = () => useProjectsStore(state => state.projects)
export const useProjectListLoading = () => useProjectsStore(state => state.isLoading)
export const useProjectsActions = () => useProjectsStore(state => state.actions)

export const getProjectMeta = () => useProjectsStore.getState().currentProject
export const setProjectMeta = (meta: ProjectMeta): void => {
  useProjectsStore.getState().actions.loadProject(meta)
}
