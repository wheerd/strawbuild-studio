# Firebase Integration Plan

This document outlines the implementation plan for adding Firebase backend support to Strawbaler, enabling cloud sync, user authentication, and multi-project management while maintaining offline-first functionality.

## Goals

- **Optional backend**: App works fully offline without Firebase
- **Cloud sync**: Signed-in users get automatic project sync
- **Multi-project support**: Authenticated users can manage multiple projects
- **Seamless migration**: Local data becomes first cloud project on signup
- **Future-ready**: Architecture supports collaboration and premium features later

## Architecture Overview

```
+------------------------------------------------------------------+
|                    Zustand Stores (all persisted)                 |
|  useModelStore | useConfigStore | useMaterialsStore |             |
|  useProjectMetaStore (projectId + metadata)                       |
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
|                 FirebaseSyncService                              |
+------------------------------------------------------------------+
|  - Subscribes to stores (debounced)                             |
|  - Reads projectId from useProjectMetaStore (travels with data) |
|  - Serializes via partialize (same format as localStorage)      |
|  - Syncs to Firestore when online + authenticated               |
|  - Loads project -> applies migrations -> setState -> rehydrate |
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

strawbaler-materials:
  - materials, timestamps
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
                            -> FirebaseSyncService (debounced 3s)
                               -> Reads projectId from projectMetaStore
                            -> Firestore (source of truth)
```

### Project Switching

```
1. Sync current project (force sync, no debounce)
2. Fetch new project from Firestore
3. Apply migrations if needed (version check)
4. Regenerate derived state
5. Update all stores atomically (including projectMetaStore)
6. localStorage overwritten with new project data
```

### Sign Up Flow (Local -> Cloud)

```
1. User creates account
2. Local project already has UUID from projectMetaStore
3. Sync local data to Firestore at /projects/{local-uuid}
4. Continue working with same projectId
```

## Firestore Data Model

```
/users/{userId}
  - email: string
  - displayName: string?
  - createdAt: timestamp
  - subscription: 'free' | 'premium'

/projects/{projectId}
  - name: string
  - description: string?
  - userId: string
  - createdAt: timestamp
  - updatedAt: timestamp

  /data/{document=current}
    - modelState: { ...partialized model store state... }
    - configState: { ...partialized config store state... }
    - materialsState: { ...partialized materials store state... }
    - projectMetaState: { ...projectMetaStore state... }
    - version: number (store version for migration tracking)
    - syncedAt: timestamp
```

**Note**: Firestore has a 1MB document limit. Most projects should fit, but we could split into subcollections if needed later.

## Derived State Handling

The store has derived state that:

1. Should NOT be persisted (waste of space, computed from other data)
2. MUST be present at runtime (store breaks without it)
3. Must be regenerated on rehydration

| Derived State              | Regeneration Function                         |
| -------------------------- | --------------------------------------------- |
| `_perimeterGeometry`       | `updatePerimeterGeometry(state, perimeterId)` |
| `_perimeterWallGeometry`   | `updatePerimeterGeometry(state, perimeterId)` |
| `_perimeterCornerGeometry` | `updatePerimeterGeometry(state, perimeterId)` |
| `_openingGeometry`         | `updatePerimeterGeometry(state, perimeterId)` |
| `_wallPostGeometry`        | `updatePerimeterGeometry(state, perimeterId)` |
| `_constraintsByEntity`     | Rebuild from `buildingConstraints`            |

A helper function `regenerateDerivedState()` must be called:

- On localStorage rehydration (`onRehydrateStorage`)
- On Firebase project load (before setting state)

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

#### New Files

**`src/building/store/regenerateDerivedState.ts`**

```typescript
import type { PerimeterId } from '@/building/model/ids'
import type { ConstraintEntityId, ConstraintId } from '@/building/model/ids'
import { getReferencedEntityIds } from '@/editor/gcs/constraintTranslator'

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
    const entityIds = getReferencedEntityIds(constraint)
    for (const entityId of entityIds) {
      const list = state._constraintsByEntity[entityId as ConstraintEntityId]
      if (list) {
        if (!list.includes(constraint.id as ConstraintId)) {
          list.push(constraint.id as ConstraintId)
        }
      } else {
        state._constraintsByEntity[entityId as ConstraintEntityId] = [constraint.id as ConstraintId]
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
    actions,
    // Exclude geometry caches (computed from other data)
    _perimeterGeometry,
    _perimeterWallGeometry,
    _perimeterCornerGeometry,
    _openingGeometry,
    _wallPostGeometry,
    // Exclude reverse index (computed from constraints)
    _constraintsByEntity,
    ...rest
  } = state as any
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

### Phase 2: Project Meta Store + Firebase Setup

**Goal**: Add project metadata store (persisted) and Firebase infrastructure.

#### Dependencies

```bash
pnpm add firebase
```

#### Environment Variables

Add to `.env.development.local` (gitignored):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

#### Type Declarations

Add to `vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_SKETCHUP_API_URL?: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

export const FIREBASE_ENABLED = !!import.meta.env.VITE_FIREBASE_API_KEY
```

#### New Files

**`src/shared/store/projectMetaStore.ts`**

Persisted store for project metadata. The projectId is a UUID that travels with the project data:

```typescript
import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// or crypto.randomUUID()

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
    (set, get) => ({
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

**`src/shared/services/FirebaseService.ts`**

Singleton service for Firebase initialization and core operations:

```typescript
import { FirebaseApp, initializeApp } from 'firebase/app'
import {
  Auth,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { Firestore, getFirestore } from 'firebase/firestore'

export interface IFirebaseService {
  initialize(): Promise<void>
  isReady(): boolean

  // Authentication
  signIn(email: string, password: string): Promise<User>
  signUp(email: string, password: string): Promise<User>
  signOut(): Promise<void>
  getCurrentUser(): User | null
  onAuthStateChanged(callback: (user: User | null) => void): () => void

  // Firestore access
  getFirestore(): Firestore
}

class FirebaseServiceImpl implements IFirebaseService {
  private app: FirebaseApp | null = null
  private auth: Auth | null = null
  private firestore: Firestore | null = null

  async initialize(): Promise<void> {
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      console.log('Firebase not configured, running in offline mode')
      return
    }

    this.app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    })

    this.auth = getAuth(this.app)
    this.firestore = getFirestore(this.app)
  }

  isReady(): boolean {
    return this.app !== null
  }

  // ... implement other methods
}

export const FirebaseService: IFirebaseService = new FirebaseServiceImpl()
```

**`src/shared/store/authStore.ts`**

```typescript
import type { User } from 'firebase/auth'
import { create } from 'zustand'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export type AuthStore = AuthState & { actions: AuthActions }

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true
}

export const useAuthStore = create<AuthStore>()(set => ({
  ...initialState,
  actions: {
    setUser: user =>
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false
      }),
    setLoading: loading => set({ isLoading: loading }),
    reset: () => set(initialState)
  }
}))

// Selector hooks
export const useUser = () => useAuthStore(state => state.user)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore(state => state.isLoading)
export const useAuthActions = () => useAuthStore(state => state.actions)
```

**`src/shared/store/projectListStore.ts`**

In-memory store for the list of user's projects (loaded from Firestore, not persisted):

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

**`src/shared/context/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, ReactNode } from 'react'
import { FirebaseService } from '@/shared/services/FirebaseService'
import { useAuthActions } from '@/shared/store/authStore'

interface AuthContextValue {
  // Can add additional context values if needed
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading } = useAuthActions()

  useEffect(() => {
    if (!FirebaseService.isReady()) {
      setLoading(false)
      return
    }

    const unsubscribe = FirebaseService.onAuthStateChanged((user) => {
      setUser(user)
    })

    return unsubscribe
  }, [setUser, setLoading])

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
```

**`src/shared/components/AuthModal.tsx`**

Modal component with:

- Tab-based UI (Sign In / Register)
- Email/password forms
- Form validation
- Error handling and display
- Loading states
- Optional: Google OAuth button (extra Firebase config)

**`src/shared/components/UserMenu.tsx`**

User menu component showing:

- User email
- Sign out button
- Only visible when authenticated

#### Files to Modify

**`src/app/main.tsx`**

Add Firebase initialization:

```typescript
import { FirebaseService } from '@/shared/services/FirebaseService'

async function bootstrap() {
  // ... existing WASM loading ...

  // Initialize Firebase conditionally
  if (FIREBASE_ENABLED) {
    try {
      await FirebaseService.initialize()
    } catch (error) {
      console.error('Firebase initialization failed, continuing in offline mode:', error)
    }
  }

  // ... rest of bootstrap ...
}
```

**`src/app/App.tsx`**

Wrap with AuthProvider:

```typescript
import { AuthProvider } from '@/shared/context/AuthContext'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* ... existing content ... */}
      </AuthProvider>
    </ThemeProvider>
  )
}
```

**`src/building/store/persistenceStore.ts`**

Add sync status fields:

```typescript
interface PersistenceState {
  // ... existing fields ...

  // Cloud sync status
  isSyncing: boolean
  lastSynced: Date | null
  syncError: string | null
}

interface PersistenceActions {
  // ... existing actions ...

  // Cloud sync actions
  setSyncing: (isSyncing: boolean) => void
  setSyncSuccess: () => void
  setSyncError: (error: string) => void
  clearSyncError: () => void
}
```

---

### Phase 3: Cloud Sync Service

**Goal**: Implement automatic cloud sync for authenticated users.

#### New Files

**`src/shared/services/FirebaseSyncService.ts`**

The sync service reads `projectId` from the persisted `projectMetaStore`, eliminating race conditions:

```typescript
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'

import { useModelStore } from '@/building/store'
import { CURRENT_VERSION as MODEL_VERSION } from '@/building/store/migrations'
import { usePersistenceActions } from '@/building/store/persistenceStore'
import { regenerateDerivedState } from '@/building/store/regenerateDerivedState'
import { useConfigStore } from '@/construction/config/store'
import { CURRENT_VERSION as CONFIG_VERSION } from '@/construction/config/store/migrations'
import { useMaterialsStore } from '@/construction/materials/store'
import { MATERIALS_STORE_VERSION } from '@/construction/materials/store/migrations'
import { useAuthStore } from '@/shared/store/authStore'
import { type ProjectListItem, useProjectListStore } from '@/shared/store/projectListStore'
import { type ProjectMeta, getProjectMeta, setProjectMeta, useProjectMetaStore } from '@/shared/store/projectMetaStore'

import { FirebaseService } from './FirebaseService'

class FirebaseSyncService {
  private syncTimeoutId: ReturnType<typeof setTimeout> | null = null
  private unsubscribers: (() => void)[] = []
  private initialized = false

  initialize(): void {
    if (this.initialized) return
    this.initialized = true

    // Subscribe to auth state changes
    const unsubscribeAuth = useAuthStore.subscribe((state, prevState) => {
      if (state.isAuthenticated && !prevState.isAuthenticated) {
        this.handleSignIn()
      }
      if (!state.isAuthenticated && prevState.isAuthenticated) {
        this.handleSignOut()
      }
    })

    // Subscribe to data stores for sync
    this.subscribeToStoreChanges()

    this.unsubscribers.push(unsubscribeAuth)
  }

  private handleSignIn = async (): Promise<void> => {
    // Load user's project list from Firestore
    await this.loadProjectList()

    const projects = useProjectListStore.getState().projects
    const currentProjectId = getProjectMeta().projectId

    // Check if current local project exists in cloud
    const existingProject = projects.find(p => p.id === currentProjectId)

    if (existingProject) {
      // Local project already in cloud - sync local changes up
      await this.syncToCloud()
    } else if (projects.length === 0) {
      // No cloud projects - upload local as first project
      await this.syncToCloud()
    } else {
      // Cloud projects exist but local is new - prompt user?
      // For now: upload local project to cloud (it has its own UUID)
      await this.syncToCloud()
    }
  }

  private handleSignOut = (): void => {
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId)
      this.syncTimeoutId = null
    }
    useProjectListStore.getState().actions.reset()
  }

  private subscribeToStoreChanges = (): void => {
    const scheduleSync = () => this.scheduleSync()

    // Subscribe to all data stores + projectMetaStore
    const unsubModel = useModelStore.subscribe(scheduleSync)
    const unsubConfig = useConfigStore.subscribe(scheduleSync)
    const unsubMaterials = useMaterialsStore.subscribe(scheduleSync)
    const unsubProjectMeta = useProjectMetaStore.subscribe(scheduleSync)

    this.unsubscribers.push(unsubModel, unsubConfig, unsubMaterials, unsubProjectMeta)
  }

  private scheduleSync = (): void => {
    const { isAuthenticated } = useAuthStore.getState()
    const isOnline = navigator.onLine

    if (!isAuthenticated || !isOnline) return

    // Debounce: wait 3s after last change
    if (this.syncTimeoutId) clearTimeout(this.syncTimeoutId)
    this.syncTimeoutId = setTimeout(() => this.syncToCloud(), 3000)
  }

  private syncToCloud = async (): Promise<void> => {
    if (!FirebaseService.isReady()) return

    // Read projectId from persisted store (key insight!)
    const projectMeta = getProjectMeta()
    const projectId = projectMeta.projectId

    const persistenceActions = usePersistenceActions()
    persistenceActions.setSyncing(true)

    try {
      const db = FirebaseService.getFirestore()

      // Serialize all store states
      const modelState = this.partializeModelStore()
      const configState = this.partializeConfigStore()
      const materialsState = this.partializeMaterialsStore()
      const projectMetaState = projectMeta

      // Write to Firestore
      await setDoc(doc(db, 'projects', projectId, 'data', 'current'), {
        modelState,
        configState,
        materialsState,
        projectMetaState,
        version: MODEL_VERSION,
        syncedAt: serverTimestamp()
      })

      // Update project metadata in Firestore
      await setDoc(
        doc(db, 'projects', projectId),
        {
          name: projectMeta.name,
          description: projectMeta.description,
          userId: FirebaseService.getCurrentUser()!.uid,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )

      persistenceActions.setSyncSuccess()
    } catch (error) {
      persistenceActions.setSyncError(error instanceof Error ? error.message : 'Sync failed')
    }
  }

  loadProjectList = async (): Promise<void> => {
    if (!FirebaseService.isReady()) return

    const userId = FirebaseService.getCurrentUser()?.uid
    if (!userId) return

    useProjectListStore.getState().actions.setLoading(true)

    try {
      const db = FirebaseService.getFirestore()
      const projectsRef = collection(db, 'projects')
      const q = query(projectsRef, orderBy('updatedAt', 'desc'))
      const snapshot = await getDocs(q)

      const projects: ProjectListItem[] = snapshot.docs
        .filter(doc => doc.data().userId === userId)
        .map(doc => ({
          id: doc.id,
          name: doc.data().name,
          description: doc.data().description,
          updatedAt: doc.data().updatedAt.toDate()
        }))

      useProjectListStore.getState().actions.setProjects(projects)
    } catch (error) {
      console.error('Failed to load project list:', error)
    } finally {
      useProjectListStore.getState().actions.setLoading(false)
    }
  }

  loadProject = async (projectId: string): Promise<void> => {
    if (!FirebaseService.isReady()) return

    const persistenceActions = usePersistenceActions()
    useProjectListStore.getState().actions.setLoading(true)

    try {
      const db = FirebaseService.getFirestore()
      const snapshot = await getDoc(doc(db, 'projects', projectId, 'data', 'current'))

      if (!snapshot.exists()) {
        throw new Error('Project not found')
      }

      const data = snapshot.data()

      // Apply migrations if needed
      const modelState = applyModelMigrations(data.modelState, data.version)
      const configState = applyConfigMigrations(data.configState, data.version)
      const materialsState = applyMaterialsMigrations(data.materialsState, data.version)
      const projectMetaState = data.projectMetaState as ProjectMeta

      // Regenerate derived state BEFORE setting
      regenerateDerivedState(modelState)

      // Update all stores atomically
      useModelStore.setState(modelState)
      useConfigStore.setState(configState)
      useMaterialsStore.setState(materialsState)
      setProjectMeta(projectMetaState)

      persistenceActions.setHydrated(true)
    } catch (error) {
      console.error('Failed to load project:', error)
      throw error
    } finally {
      useProjectListStore.getState().actions.setLoading(false)
    }
  }

  createNewProject = async (name: string, description?: string): Promise<string> => {
    // Generate new project meta
    const newMeta: ProjectMeta = {
      projectId: crypto.randomUUID(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Reset all stores to initial state
    useModelStore.getState().actions.reset()
    useConfigStore.getState().actions.reset()
    useMaterialsStore.getState().actions.reset()

    // Set new project meta (this will trigger sync)
    setProjectMeta(newMeta)

    return newMeta.projectId
  }

  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId)
    }
  }

  // Partialize helpers (mirror persist middleware logic)
  private partializeModelStore() {
    /* ... */
  }
  private partializeConfigStore() {
    /* ... */
  }
  private partializeMaterialsStore() {
    /* ... */
  }
}

export const firebaseSyncService = new FirebaseSyncService()
```

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

#### Integration Points

Add ProjectSelector to:

- App header/toolbar
- Settings panel

Add "Sign In" button to:

- App header when not authenticated
- Show UserMenu when authenticated

---

### Phase 5: Firestore Security Rules

**Goal**: Secure Firestore access per-user.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Projects belong to users
    match /projects/{projectId} {
      // Allow if authenticated and project belongs to user
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;

      // Project data subcollection
      match /data/{document=**} {
        allow read, write: if request.auth != null
          && get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid;
      }
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

1. **`regenerateDerivedState`**: Test that geometry and reverse index are correctly regenerated from base state
2. **`partialize`**: Verify derived state is excluded from serialization
3. **Migration compatibility**: Test that existing migration functions work with Firebase-loaded data
4. **ProjectMetaStore**: Verify UUID generation and persistence

### Integration Tests

1. **Sync flow**: Test debounced sync triggers correctly
2. **Project switching**: Test data is properly loaded/stored with correct projectId
3. **Offline behavior**: Test app works without Firebase configured
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
- Update security rules for shared access
- Implement real-time sync with Firestore `onSnapshot`
- Add conflict markers for simultaneous edits
- User presence indicators

### Premium Features

- Use Firebase Remote Config for feature flags
- Or simple `subscription` field on user document
- Premium APIs (enhanced exports, etc.) require auth + subscription check
- Existing `VITE_SKETCHUP_API_URL` pattern can be extended for authenticated API calls

### Data Size Management

- Monitor Firestore document sizes
- Consider subcollections for large projects
- Implement pagination for project lists
- Add usage limits per subscription tier

---

## Rollback Plan

If Firebase integration causes issues:

1. **Disable Firebase**: Remove env variables -> app reverts to offline mode
2. **User data safe**: localStorage always has current project (with projectId)
3. **Export/import**: Users can export projects manually
4. **No breaking changes**: Existing functionality unaffected

---

## Checklist

### Phase 1: Derived State Cleanup

- [ ] Create `regenerateDerivedState.ts`
- [ ] Update `partialize` in model store
- [ ] Add `onRehydrateStorage` regeneration
- [ ] Test localStorage persistence still works
- [ ] Test geometry regenerates correctly on load

### Phase 2: Project Meta Store + Firebase Setup

- [ ] Add Firebase dependency
- [ ] Add environment variables
- [ ] Create `projectMetaStore.ts` (persisted, with UUID)
- [ ] Create `projectListStore.ts` (in-memory)
- [ ] Create `FirebaseService.ts`
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

- [ ] Create `FirebaseSyncService.ts`
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

### Phase 5: Security

- [ ] Write Firestore security rules
- [ ] Deploy rules
- [ ] Test security (users can't access other users' data)
