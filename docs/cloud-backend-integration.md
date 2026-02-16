# Cloud Backend Integration Plan

This document outlines the implementation plan for adding cloud backend support to Strawbaler, enabling cloud sync, user authentication, and multi-project management while maintaining offline-first functionality.

## Goals

- **Optional backend**: App works fully offline without cloud services
- **Cloud sync**: Signed-in users get automatic project sync
- **Multi-project support**: Authenticated users can manage multiple projects
- **Seamless migration**: Local data becomes first cloud project on signup
- **Future-ready**: Architecture supports collaboration and premium features later

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                    Zustand Stores (all persisted)                 |
|  useModelStore | useConfigStore | useMaterialsStore |             |
|  usePartsStore | useProjectMetaStore (projectId + metadata)      |
+------------------------------------------------------------------+
|  Persist Middleware:                                             |
|  - partialize: exclude actions + geometry + reverseIndex        |
|  - migrate: existing migration functions                        |
|  - onRehydrateStorage: regenerate derived state                 |
|                          |                                       |
|                          v                                       |
|                    localStorage                                  |
+----------------------------------+-------------------------------+
                                   |
                                   | store.subscribe()
                                   v
+------------------------------------------------------------------+
|                 CloudSyncService (interface)                     |
+------------------------------------------------------------------+
|  - Subscribes to stores (debounced)                             |
|  - Reads projectId from useProjectMetaStore (travels with data) |
|  - Serializes via partialize (same format as localStorage)      |
|  - Syncs to cloud when online + authenticated                   |
|  - Loads project -> applies migrations -> setState -> rehydrate |
+------------------------------------------------------------------+
                 |
                 v
    +-------------------------+
    |  SupabaseSyncService    |
    |  (implementation)       |
    +-------------------------+
```

## Key Design Decision: Project ID Travels With Data

The `projectId` is stored in a **persisted** `useProjectMetaStore`. This eliminates race conditions between project switching and sync:

**Problem with separate project tracking:**

```
1. User edits project A
2. Within 3s, user switches to project B
3. Debounced sync fires -> syncs to project B (wrong!)
```

**Solution: projectId in persisted store:**

```
1. User edits project A (projectId: "uuid-a" in store)
2. User switches to project B (projectId: "uuid-b" in store)
3. Debounced sync fires -> reads projectId from store -> syncs to project B (correct!)
```

Even offline/local projects get a UUID on creation, so when a user signs up, their local project already has an ID ready for cloud sync.

## localStorage Structure

```
strawbaler-project-meta:
  - projectId: string (UUID, generated on first use)
  - name: string
  - description?: string
  - createdAt: timestamp
  - updatedAt: timestamp
  - version: number

strawbaler-model:
  - storeys, perimeters, walls, corners, etc.
  - (excludes: _perimeterGeometry, _openingGeometry, etc.)

strawbaler-config:
  - wallAssemblyConfigs, floorAssemblyConfigs, etc.

strawbaler-materials:
  - materials, timestamps

strawbaler-parts:
  - labels, nextLabelIndexByGroup
  - (excludes: usedLabelsByGroup - regenerated on rebuild)
```

## Data Flow

### Offline Mode (Not Logged In)

```
User edits -> Zustand stores -> localStorage (immediate)
                            -> Local project with UUID (ready for cloud migration)
```

### Online Mode (Logged In)

```
User edits -> Zustand stores -> localStorage (immediate, acts as cache)
                            -> CloudSyncService (debounced 3s)
                               -> Reads projectId from projectMetaStore
                            -> Cloud database (source of truth)
```

### Project Switching

```
1. Sync current project (force sync, no debounce)
2. Fetch new project from cloud
3. Apply migrations if needed (version check)
4. Regenerate derived state
5. Update all stores atomically (including projectMetaStore)
6. localStorage overwritten with new project data
```

### Sign Up Flow (Local -> Cloud)

```
1. User creates account
2. Local project already has UUID from projectMetaStore
3. Sync local data to cloud at /projects/{local-uuid}
4. Continue working with same projectId
```

---

## Derived State Handling

The store has derived state that:

1. Should NOT be persisted (waste of space, computed from other data)
2. MUST be present at runtime (store breaks without it)
3. Must be regenerated on rehydration

| Derived State              | Regeneration Function                               |
| -------------------------- | --------------------------------------------------- |
| `_perimeterGeometry`       | `updatePerimeterGeometry(state, perimeterId)`       |
| `_perimeterWallGeometry`   | `updatePerimeterGeometry(state, perimeterId)`       |
| `_perimeterCornerGeometry` | `updatePerimeterGeometry(state, perimeterId)`       |
| `_openingGeometry`         | `updatePerimeterGeometry(state, perimeterId)`       |
| `_wallPostGeometry`        | `updatePerimeterGeometry(state, perimeterId)`       |
| `_constraintsByEntity`     | Rebuild from `buildingConstraints`                  |
| `usedLabelsByGroup`        | Rebuild from `labels` + `definitions` (parts store) |

A helper function `regenerateDerivedState()` must be called:

- On localStorage rehydration (`onRehydrateStorage`)
- On cloud project load (before setting state)

---

## Supabase Implementation

### PostgreSQL Schema with JSONB

```sql
-- Projects table (stores all project data as JSONB)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Store states as JSONB (document storage pattern)
  model_state JSONB NOT NULL DEFAULT '{}',
  config_state JSONB NOT NULL DEFAULT '{}',
  materials_state JSONB NOT NULL DEFAULT '{}',
  parts_label_state JSONB NOT NULL DEFAULT '{}',
  project_meta JSONB NOT NULL DEFAULT '{}',
  version INT DEFAULT 14
);

-- Index for user queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- Enable Row-Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Users table for additional metadata
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  display_name TEXT,
  subscription TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Supabase Sync Logic

```typescript
// Sync: Upsert single row
const { error } = await supabase
  .from('projects')
  .upsert({
    id: projectId,
    user_id: userId,
    name: projectMeta.name,
    description: projectMeta.description,
    model_state: modelState,
    config_state: configState,
    materials_state: materialsState,
    parts_label_state: partsLabelState,
    project_meta: projectMeta,
    version: MODEL_VERSION,
    updated_at: new Date().toISOString()
  })

// Load: Read single row
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single()

// Load project list
const { data, error } = await supabase
  .from('projects')
  .select('id, name, description, updated_at')
  .order('updated_at', { ascending: false })
```

### Supabase Real-time (Future Collaboration)

```typescript
// Subscribe to project changes
supabase
  .channel(`project:${projectId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${projectId}`
    },
    payload => {
      const { model_state, config_state, materials_state, parts_label_state } = payload.new
      // Handle remote update
    }
  )
  .subscribe()
```

---

## CloudSyncService Abstraction

### Interface Definition

**`src/shared/services/CloudSyncService.ts`**

```typescript
export interface ProjectData {
  modelState: unknown
  configState: unknown
  materialsState: unknown
  partsLabelState: unknown
  projectMetaState: unknown
  version: number
}

export interface ProjectListItem {
  id: string
  name: string
  description?: string
  updatedAt: Date
}

export interface ICloudSyncService {
  // Lifecycle
  initialize(): Promise<void>
  destroy(): void
  isReady(): boolean

  // Sync operations
  sync(projectId: string, data: ProjectData): Promise<void>
  load(projectId: string): Promise<ProjectData>

  // Project list
  loadProjectList(): Promise<ProjectListItem[]>

  // Auth integration
  getCurrentUserId(): string | null
}
```

### Supabase Implementation

**`src/shared/services/SupabaseSyncService.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

import type { ICloudSyncService, ProjectData, ProjectListItem } from './CloudSyncService'

export class SupabaseSyncService implements ICloudSyncService {
  private supabase: SupabaseClient | null = null

  async initialize(): Promise<void> {
    this.supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  }

  destroy(): void {
    /* ... */
  }
  isReady(): boolean {
    return this.supabase !== null
  }

  async sync(projectId: string, data: ProjectData): Promise<void> {
    const { error } = await this.supabase!.from('projects').upsert({
      id: projectId,
      user_id: this.getCurrentUserId(),
      name: (data.projectMetaState as any).name,
      model_state: data.modelState,
      config_state: data.configState,
      materials_state: data.materialsState,
      parts_label_state: data.partsLabelState,
      project_meta: data.projectMetaState,
      version: data.version,
      updated_at: new Date().toISOString()
    })
    if (error) throw error
  }

  async load(projectId: string): Promise<ProjectData> {
    const { data, error } = await this.supabase!.from('projects').select('*').eq('id', projectId).single()
    if (error) throw error
    return {
      modelState: data.model_state,
      configState: data.config_state,
      materialsState: data.materials_state,
      partsLabelState: data.parts_label_state,
      projectMetaState: data.project_meta,
      version: data.version
    }
  }

  async loadProjectList(): Promise<ProjectListItem[]> {
    /* ... */
  }
  getCurrentUserId(): string | null {
    /* ... */
  }
}
```

### Service Factory

**`src/shared/services/index.ts`**

```typescript
import type { ICloudSyncService } from './CloudSyncService'
import { SupabaseSyncService } from './SupabaseSyncService'

let syncService: ICloudSyncService | null = null

export function getCloudSyncService(): ICloudSyncService {
  if (!syncService) {
    syncService = new SupabaseSyncService()
  }
  return syncService
}
```

---

## Infrastructure as Code

### Supabase CLI

**Repository structure:**

```
/supabase
  config.toml           # Project configuration
  /migrations
    20240101000000_initial_schema.sql
    20240115000000_add_indexes.sql
    20240201000000_add_rls_policies.sql
  /seed.sql             # Optional seed data
```

**Initialize:**

```bash
supabase init
supabase login
supabase link --project-ref your-project-ref
```

**Create migration:**

```bash
supabase migration new add_user_profiles
```

**`supabase/migrations/20240101000000_initial_schema.sql`:**

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  model_state JSONB NOT NULL DEFAULT '{}',
  config_state JSONB NOT NULL DEFAULT '{}',
  materials_state JSONB NOT NULL DEFAULT '{}',
  parts_label_state JSONB NOT NULL DEFAULT '{}',
  project_meta JSONB NOT NULL DEFAULT '{}',
  version INT DEFAULT 14
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

**Deploy:**

```bash
# Apply to local development
supabase db push

# Apply to production
supabase db push --linked
```

**CI/CD integration:**

```yaml
# .github/workflows/supabase-migrate.yml
name: Supabase Migrate

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## Implementation Phases

### Phase 1: Derived State Cleanup

**Goal**: Ensure derived state is properly excluded from persistence and regenerated on load.

#### Files to Modify

**`src/building/store/index.ts`**

- Update `partialize` to exclude geometry caches and reverse index
- Add regeneration logic in `onRehydrateStorage`

**`src/building/store/slices/perimeterSlice.ts`**

- Ensure geometry state initializes with empty objects (already done)

**`src/building/store/slices/constraintsSlice.ts`**

- Ensure reverse index initializes with empty object (already done)

**`src/construction/parts/store.ts`**

- Update `partialize` to exclude `usedLabelsByGroup` (regenerated on rebuild)

#### New Files

**`src/building/store/regenerateDerivedState.ts`**

```typescript
import type { PerimeterId } from '@/building/model/ids'
import type { ConstraintEntityId, ConstraintId } from '@/building/model/ids'
import {
  getReferencedCornerIds,
  getReferencedWallEntityIds,
  getReferencedWallIds
} from '@/editor/gcs/constraintTranslator'

import { updatePerimeterGeometry } from './slices/perimeterGeometry'
import type { StoreState } from './types'

export function regenerateDerivedState(state: StoreState): void {
  // 1. Regenerate all perimeter geometry (includes walls, corners, openings, posts)
  for (const perimeterId of Object.keys(state.perimeters) as PerimeterId[]) {
    updatePerimeterGeometry(state, perimeterId)
  }

  // 2. Rebuild constraints reverse index
  state._constraintsByEntity = {}
  for (const constraint of Object.values(state.buildingConstraints)) {
    const { id: _id, ...input } = constraint
    const cornerIds = getReferencedCornerIds(input)
    const wallIds = getReferencedWallIds(input)
    const wallEntityIds = getReferencedWallEntityIds(input)
    const entityIds = [...cornerIds, ...wallIds, ...wallEntityIds]

    for (const entityId of entityIds) {
      const list = state._constraintsByEntity[entityId]
      if (list) {
        if (!list.includes(constraint.id)) {
          list.push(constraint.id)
        }
      } else {
        state._constraintsByEntity[entityId] = [constraint.id]
      }
    }
  }
}
```

#### Changes to `src/building/store/index.ts`

Update `partialize`:

```typescript
partialize: state => {
  const {
    actions: _actions,
    // Exclude geometry caches (computed from other data)
    _perimeterGeometry,
    _perimeterWallGeometry,
    _perimeterCornerGeometry,
    _openingGeometry,
    _wallPostGeometry,
    // Exclude reverse index (computed from constraints)
    _constraintsByEntity,
    ...rest
  } = state as StoreState & { actions: unknown }
  return rest
}
```

Update `onRehydrateStorage`:

```typescript
onRehydrateStorage: () => state => {
  if (state) {
    // Regenerate derived state after rehydration
    regenerateDerivedState(state)

    const persistenceActions = getPersistenceActions()
    persistenceActions.setHydrated(true)
  }
}
```

---

### Phase 2: Project Meta Store + Cloud Backend Setup

**Goal**: Add project metadata store (persisted) and cloud backend infrastructure.

#### Dependencies

```bash
pnpm add @supabase/supabase-js
```

#### Environment Variables

Add to `.env.development.local` (gitignored):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

#### Type Declarations

Add to `vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_SKETCHUP_API_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

export const CLOUD_ENABLED = !!import.meta.env.VITE_SUPABASE_URL
```

#### New Files

**`src/shared/store/projectMetaStore.ts`**

Persisted store for project metadata. The projectId is a UUID that travels with the project data:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ProjectMeta {
  projectId: string // UUID, stable across sessions
  name: string
  description?: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

interface ProjectMetaState {
  currentProject: ProjectMeta
}

interface ProjectMetaActions {
  setProjectName: (name: string) => void
  setProjectDescription: (description: string) => void
  touchUpdatedAt: () => void
  loadProject: (meta: ProjectMeta) => void
  resetToNew: () => void
}

export type ProjectMetaStore = ProjectMetaState & { actions: ProjectMetaActions }

const createNewProjectMeta = (): ProjectMeta => ({
  projectId: crypto.randomUUID(),
  name: 'My Project',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const CURRENT_VERSION = 1

export const useProjectMetaStore = create<ProjectMetaStore>()(
  persist(
    set => ({
      currentProject: createNewProjectMeta(),

      actions: {
        setProjectName: name =>
          set(state => ({
            currentProject: {
              ...state.currentProject,
              name,
              updatedAt: new Date().toISOString()
            }
          })),

        setProjectDescription: description =>
          set(state => ({
            currentProject: {
              ...state.currentProject,
              description,
              updatedAt: new Date().toISOString()
            }
          })),

        touchUpdatedAt: () =>
          set(state => ({
            currentProject: {
              ...state.currentProject,
              updatedAt: new Date().toISOString()
            }
          })),

        loadProject: meta => set({ currentProject: meta }),

        resetToNew: () => set({ currentProject: createNewProjectMeta() })
      }
    }),
    {
      name: 'strawbaler-project-meta',
      version: CURRENT_VERSION,
      partialize: state => ({
        currentProject: state.currentProject
      })
    }
  )
)

// Selector hooks
export const useCurrentProject = () => useProjectMetaStore(state => state.currentProject)
export const useProjectId = () => useProjectMetaStore(state => state.currentProject.projectId)
export const useProjectName = () => useProjectMetaStore(state => state.currentProject.name)
export const useProjectMetaActions = () => useProjectMetaStore(state => state.actions)

// Non-reactive access for sync service
export const getProjectMeta = () => useProjectMetaStore.getState().currentProject
export const setProjectMeta = (meta: ProjectMeta) => useProjectMetaStore.getState().actions.loadProject(meta)
```

**`src/shared/services/CloudSyncService.ts`** (interface)

```typescript
export interface ProjectData {
  modelState: unknown
  configState: unknown
  materialsState: unknown
  partsLabelState: unknown
  projectMetaState: unknown
  version: number
}

export interface ProjectListItem {
  id: string
  name: string
  description?: string
  updatedAt: Date
}

export interface ICloudSyncService {
  initialize(): Promise<void>
  destroy(): void
  isReady(): boolean

  sync(projectId: string, data: ProjectData): Promise<void>
  load(projectId: string): Promise<ProjectData>
  loadProjectList(): Promise<ProjectListItem[]>
  getCurrentUserId(): string | null
}
```

**`src/shared/store/authStore.ts`**

```typescript
import { create } from 'zustand'

interface AuthState {
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setAuthenticated: (userId: string, email: string) => void
  setAnonymous: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export type AuthStore = AuthState & { actions: AuthActions }

const initialState: AuthState = {
  userId: null,
  email: null,
  isAuthenticated: false,
  isLoading: true
}

export const useAuthStore = create<AuthStore>()(set => ({
  ...initialState,
  actions: {
    setAuthenticated: (userId, email) =>
      set({
        userId,
        email,
        isAuthenticated: true,
        isLoading: false
      }),
    setAnonymous: () =>
      set({
        userId: null,
        email: null,
        isAuthenticated: false,
        isLoading: false
      }),
    setLoading: loading => set({ isLoading: loading }),
    reset: () => set(initialState)
  }
}))

// Selector hooks
export const useUserId = () => useAuthStore(state => state.userId)
export const useUserEmail = () => useAuthStore(state => state.email)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore(state => state.isLoading)
export const useAuthActions = () => useAuthStore(state => state.actions)
```

**`src/shared/store/projectListStore.ts`**

In-memory store for the list of user's projects (loaded from cloud, not persisted):

```typescript
import { create } from 'zustand'

export interface ProjectListItem {
  id: string
  name: string
  description?: string
  updatedAt: Date
}

interface ProjectListState {
  projects: ProjectListItem[]
  isLoading: boolean
}

interface ProjectListActions {
  setProjects: (projects: ProjectListItem[]) => void
  addProject: (project: ProjectListItem) => void
  removeProject: (projectId: string) => void
  updateProject: (projectId: string, updates: Partial<ProjectListItem>) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export type ProjectListStore = ProjectListState & { actions: ProjectListActions }

const initialState: ProjectListState = {
  projects: [],
  isLoading: false
}

export const useProjectListStore = create<ProjectListStore>()(set => ({
  ...initialState,
  actions: {
    setProjects: projects => set({ projects }),
    addProject: project =>
      set(state => ({
        projects: [...state.projects, project]
      })),
    removeProject: projectId =>
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId)
      })),
    updateProject: (projectId, updates) =>
      set(state => ({
        projects: state.projects.map(p => (p.id === projectId ? { ...p, ...updates } : p))
      })),
    setLoading: loading => set({ isLoading: loading }),
    reset: () => set(initialState)
  }
}))

// Selector hooks
export const useProjectList = () => useProjectListStore(state => state.projects)
export const useProjectListLoading = () => useProjectListStore(state => state.isLoading)
export const useProjectListActions = () => useProjectListStore(state => state.actions)
```

---

### Phase 3: Cloud Sync Service Implementation

**Goal**: Implement automatic cloud sync for authenticated users.

#### New Files

**`src/shared/services/SupabaseSyncService.ts`**

The sync service reads `projectId` from the persisted `projectMetaStore`, eliminating race conditions. See the [Supabase Sync Logic](#supabase-sync-logic) section for implementation details.

---

### Phase 4: Project Management UI

**Goal**: Allow users to create, switch between, and manage multiple projects.

#### New Files

**`src/shared/components/ProjectsModal.tsx`**

Modal component with:

- List all user projects (from `useProjectListStore`)
- Create new project (calls `createNewProject`)
- Rename project
- Delete project with confirmation
- Select/open project (calls `loadProject`)
- Last modified timestamp display
- Shows current project indicator (matches `useProjectId`)

**`src/shared/components/ProjectSelector.tsx`**

Quick project switcher component:

- Shows current project name (from `useProjectName`)
- Dropdown for quick switching
- "Manage Projects" button to open ProjectsModal
- Only visible when authenticated

---

### Phase 5: Security & IaC

**Goal**: Secure cloud access and enable infrastructure-as-code deployment.

#### Supabase

- [ ] Create initial migration with schema + RLS policies
- [ ] Test locally with `supabase db push`
- [ ] Deploy to production
- [ ] Set up CI/CD for automatic migrations

---

## Testing Strategy

### Unit Tests

1. **`regenerateDerivedState`**: Test that geometry and reverse index are correctly regenerated from base state
2. **`partialize`**: Verify derived state is excluded from serialization
3. **Migration compatibility**: Test that existing migration functions work with cloud-loaded data
4. **ProjectMetaStore**: Verify UUID generation and persistence

### Integration Tests

1. **Sync flow**: Test debounced sync triggers correctly
2. **Project switching**: Test data is properly loaded/stored with correct projectId
3. **Offline behavior**: Test app works without cloud configured
4. **Auth state changes**: Test proper cleanup on sign out
5. **Race condition**: Test that rapid project switching doesn't cause data corruption

### Manual Testing

1. Sign up with new account -> local data (with existing UUID) syncs to cloud
2. Sign in on new device -> projects load from cloud
3. Edit offline -> changes sync when back online
4. Switch projects rapidly -> correct data loads, no corruption
5. Sign out -> local cache preserved with correct projectId

---

## Future Considerations

### Collaboration (Phase 6+)

- Add `collaborators` field to project documents
- Update RLS policies for shared access
- Implement real-time sync (Supabase realtime)
- Add conflict markers for simultaneous edits
- User presence indicators

### Premium Features

- Use `subscription` field on user record
- Premium APIs (enhanced exports, etc.) require auth + subscription check
- Existing `VITE_SKETCHUP_API_URL` pattern can be extended for authenticated API calls

### Data Size Management

- Monitor row sizes
- Consider splitting large projects (Supabase related tables)
- Implement pagination for project lists
- Add usage limits per subscription tier

---

## Rollback Plan

If cloud integration causes issues:

1. **Disable cloud**: Remove env variables -> app reverts to offline mode
2. **User data safe**: localStorage always has current project (with projectId)
3. **Export/import**: Users can export projects manually
4. **No breaking changes**: Existing functionality unaffected

---

## Checklist

### Phase 1: Derived State Cleanup

- [x] Create `regenerateDerivedState.ts`
- [x] Update `partialize` in model store
- [x] Add `onRehydrateStorage` regeneration
- [x] Update `partialize` in parts store to exclude `usedLabelsByGroup`
- [ ] Test localStorage persistence still works
- [ ] Test geometry regenerates correctly on load

### Phase 2: Project Meta Store + Cloud Setup

- [ ] Add cloud backend dependency (@supabase/supabase-js)
- [ ] Add environment variables
- [ ] Create `projectMetaStore.ts` (persisted, with UUID)
- [ ] Create `projectListStore.ts` (in-memory)
- [ ] Create `CloudSyncService.ts` (interface)
- [ ] Create `authStore.ts`
- [ ] Create `AuthContext.tsx`
- [ ] Create `AuthModal.tsx`
- [ ] Create `UserMenu.tsx`
- [ ] Update `main.tsx` initialization
- [ ] Update `App.tsx` with AuthProvider
- [ ] Add sync status to `persistenceStore`
- [ ] Test sign up / sign in / sign out
- [ ] Test projectMetaStore persists correctly

### Phase 3: Cloud Sync

- [ ] Create `SupabaseSyncService.ts`
- [ ] Implement store subscriptions (including projectMetaStore)
- [ ] Implement debounced sync (read projectId from store)
- [ ] Implement project loading
- [ ] Implement project creation
- [ ] Test sync works correctly
- [ ] Test race condition (rapid project switching)
- [ ] Test offline queue (future)

### Phase 4: Project Management UI

- [ ] Create `ProjectsModal.tsx`
- [ ] Create `ProjectSelector.tsx`
- [ ] Integrate into app UI
- [ ] Test project CRUD operations
- [ ] Test project switching

### Phase 5: Security & IaC

- [ ] Create initial migration with schema + RLS policies
- [ ] Test locally with `supabase db push`
- [ ] Deploy to production
- [ ] Test security (users can't access other users' data)
- [ ] Set up CI/CD for automatic deployments
