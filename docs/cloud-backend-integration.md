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
                 |
                 v
    +------------------------------------------------------------------+
    |                         Supabase Database                         |
    +------------------------------------------------------------------+
    |  projects (model_state, parts_label_state, config_defaults, ...)  |
    |  materials (per-material rows)                                     |
    |  config_entries (per-assembly-config rows)                        |
    +------------------------------------------------------------------+
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
  - defaultWallAssemblyId, defaultFloorAssemblyId, etc.
  - defaultStrawMaterial

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
3. Apply migrations if needed (per-store version check)
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

### PostgreSQL Schema

```sql
-- Projects table (model + parts + meta + config defaults)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Model state with its own version
  model_state JSONB NOT NULL DEFAULT '{}',
  model_version INT DEFAULT 14,

  -- Parts label state with its own version
  parts_label_state JSONB NOT NULL DEFAULT '{}',
  parts_version INT DEFAULT 1,

  -- Config defaults (default assembly IDs, defaultStrawMaterial)
  config_defaults JSONB NOT NULL DEFAULT '{}',
  config_version INT DEFAULT 1,

  -- Materials version (materials stored in separate table)
  materials_version INT DEFAULT 1
);

-- Materials table (each material as a row)
CREATE TABLE materials (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  material_id TEXT NOT NULL,  -- The MaterialId (e.g., "material-xxx")
  material_data JSONB NOT NULL,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (project_id, material_id)
);

-- Config entries (each assembly config as a row)
CREATE TABLE config_entries (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  assembly_id TEXT NOT NULL,  -- The AssemblyId (e.g., "wall-assembly-xxx")
  config_type TEXT NOT NULL CHECK (config_type IN ('wall', 'floor', 'roof', 'opening', 'ringBeam')),
  config_data JSONB NOT NULL,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (project_id, assembly_id)
);

-- User profiles (optional metadata)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_materials_project_id ON materials(project_id);
CREATE INDEX idx_config_entries_project_id ON config_entries(project_id);
CREATE INDEX idx_config_entries_type ON config_entries(project_id, config_type);

-- Enable Row-Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
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

-- RLS Policies for materials (access via project ownership)
CREATE POLICY "Users can view materials in own projects"
  ON materials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = materials.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert materials in own projects"
  ON materials FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = materials.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update materials in own projects"
  ON materials FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = materials.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete materials in own projects"
  ON materials FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = materials.project_id AND projects.user_id = auth.uid()
  ));

-- RLS Policies for config_entries (access via project ownership)
CREATE POLICY "Users can view config_entries in own projects"
  ON config_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = config_entries.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert config_entries in own projects"
  ON config_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = config_entries.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update config_entries in own projects"
  ON config_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = config_entries.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete config_entries in own projects"
  ON config_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = config_entries.project_id AND projects.user_id = auth.uid()
  ));

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Supabase Sync Logic

```typescript
interface MaterialEntry {
  materialId: string
  materialData: unknown
  timestamp: number
}

interface ConfigEntry {
  assemblyId: string
  configType: 'wall' | 'floor' | 'roof' | 'opening' | 'ringBeam'
  configData: unknown
  timestamp: number
}

// Sync: Multi-step process
async function sync(projectId: string, data: ProjectData): Promise<void> {
  const userId = getCurrentUserId()

  // 1. Upsert project row
  const { error: projectError } = await supabase.from('projects').upsert({
    id: projectId,
    user_id: userId,
    name: data.projectMeta.name,
    description: data.projectMeta.description,
    model_state: data.modelState,
    model_version: data.modelVersion,
    parts_label_state: data.partsLabelState,
    parts_version: data.partsVersion,
    config_defaults: data.configDefaults,
    config_version: data.configVersion,
    materials_version: data.materialsVersion,
    updated_at: new Date().toISOString()
  })
  if (projectError) throw projectError

  // 2. Sync materials (batch upsert, delete removed)
  const existingMaterials = await supabase.from('materials').select('material_id').eq('project_id', projectId)

  const currentMaterialIds = new Set(data.materials.map(m => m.materialId))

  // Delete materials that no longer exist
  const toDelete = existingMaterials.data.filter(m => !currentMaterialIds.has(m.material_id)).map(m => m.material_id)

  if (toDelete.length > 0) {
    await supabase.from('materials').delete().eq('project_id', projectId).in('material_id', toDelete)
  }

  // Upsert current materials
  const materialRows = data.materials.map(m => ({
    project_id: projectId,
    material_id: m.materialId,
    material_data: m.materialData,
    timestamp: m.timestamp,
    updated_at: new Date().toISOString()
  }))

  const { error: materialsError } = await supabase.from('materials').upsert(materialRows)
  if (materialsError) throw materialsError

  // 3. Sync config_entries (batch upsert, delete removed)
  const existingConfigs = await supabase.from('config_entries').select('assembly_id').eq('project_id', projectId)

  const currentConfigIds = new Set(data.configEntries.map(c => c.assemblyId))

  // Delete configs that no longer exist
  const configsToDelete = existingConfigs.data.filter(c => !currentConfigIds.has(c.assembly_id)).map(c => c.assembly_id)

  if (configsToDelete.length > 0) {
    await supabase.from('config_entries').delete().eq('project_id', projectId).in('assembly_id', configsToDelete)
  }

  // Upsert current configs
  const configRows = data.configEntries.map(c => ({
    project_id: projectId,
    assembly_id: c.assemblyId,
    config_type: c.configType,
    config_data: c.configData,
    timestamp: c.timestamp,
    updated_at: new Date().toISOString()
  }))

  const { error: configError } = await supabase.from('config_entries').upsert(configRows)
  if (configError) throw configError
}

// Load: Multi-step process
async function load(projectId: string): Promise<ProjectData> {
  // 1. Load project row
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (projectError) throw projectError

  // 2. Load materials
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('material_id, material_data, timestamp')
    .eq('project_id', projectId)
  if (materialsError) throw materialsError

  // 3. Load config entries
  const { data: configs, error: configsError } = await supabase
    .from('config_entries')
    .select('assembly_id, config_type, config_data, timestamp')
    .eq('project_id', projectId)
  if (configsError) throw configsError

  return {
    modelState: project.model_state,
    modelVersion: project.model_version,
    partsLabelState: project.parts_label_state,
    partsVersion: project.parts_version,
    configDefaults: project.config_defaults,
    configVersion: project.config_version,
    configEntries: configs.map(c => ({
      assemblyId: c.assembly_id,
      configType: c.config_type,
      configData: c.config_data,
      timestamp: c.timestamp
    })),
    materialsVersion: project.materials_version,
    materials: materials.map(m => ({
      materialId: m.material_id,
      materialData: m.material_data,
      timestamp: m.timestamp
    })),
    projectMeta: {
      name: project.name,
      description: project.description
    }
  }
}

// Load project list
async function loadProjectList(): Promise<ProjectListItem[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}
```

### Supabase Real-time (Future Collaboration)

```typescript
// Subscribe to project changes
supabase
  .channel(`project:${projectId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${projectId}`
    },
    payload => {
      // Handle project metadata changes
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'materials',
      filter: `project_id=eq.${projectId}`
    },
    payload => {
      // Handle material changes
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'config_entries',
      filter: `project_id=eq.${projectId}`
    },
    payload => {
      // Handle config changes
    }
  )
  .subscribe()
```

---

## CloudSyncService Abstraction

### Interface Definition

**`src/shared/services/CloudSyncService.ts`**

```typescript
export interface MaterialEntry {
  materialId: string
  materialData: unknown
  timestamp: number
}

export interface ConfigEntry {
  assemblyId: string
  configType: 'wall' | 'floor' | 'roof' | 'opening' | 'ringBeam'
  configData: unknown
  timestamp: number
}

export interface ProjectData {
  modelState: unknown
  modelVersion: number

  partsLabelState: unknown
  partsVersion: number

  configDefaults: unknown
  configEntries: ConfigEntry[]
  configVersion: number

  materials: MaterialEntry[]
  materialsVersion: number

  projectMeta: {
    name: string
    description?: string
  }
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

See the [Supabase Sync Logic](#supabase-sync-logic) section for implementation details.

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

See the [PostgreSQL Schema](#postgresql-schema) section for the full schema.

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
export interface MaterialEntry {
  materialId: string
  materialData: unknown
  timestamp: number
}

export interface ConfigEntry {
  assemblyId: string
  configType: 'wall' | 'floor' | 'roof' | 'opening' | 'ringBeam'
  configData: unknown
  timestamp: number
}

export interface ProjectData {
  modelState: unknown
  modelVersion: number
  partsLabelState: unknown
  partsVersion: number
  configDefaults: unknown
  configEntries: ConfigEntry[]
  configVersion: number
  materials: MaterialEntry[]
  materialsVersion: number
  projectMeta: {
    name: string
    description?: string
  }
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

- Add `subscription` field to user_profiles when needed
- Premium APIs (enhanced exports, etc.) require auth + subscription check
- Existing `VITE_SKETCHUP_API_URL` pattern can be extended for authenticated API calls

### Data Size Management

- Monitor row sizes
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
- [ ] Implement project loading (multi-table)
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
