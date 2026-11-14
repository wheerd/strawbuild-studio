# Intermediate Walls & Rooms Architecture

## Goal

Implement interior walls and rooms in the floor plan editor, enabling:

- Drawing interior walls that connect to perimeter walls or other interior walls
- Split-on-connect model: when a wall connects to another wall's midpoint, split the target wall
- Perpendicular snapping and constraints
- Wall entities (doors, windows, posts) on interior walls
- Configurable wall assemblies for interior walls with 3D construction
- Room detection from closed wall loops with user labeling

## Status Overview

| Phase                                        | Status                       |
| -------------------------------------------- | ---------------------------- |
| Phase 1: Store & Geometry                    | Done                         |
| Phase 2: Drawing Tools                       | Done                         |
| Phase 3: UI Components                       | Done                         |
| Phase A: Constraints for Intermediate Walls  | Implemented                  |
| Phase B: Wall Entities on Intermediate Walls | Core done; inspector partial |
| Phase C: Interior Wall Assembly System       | Implemented                  |
| Phase D: Room Detection & Labeling           | Not started                  |
| Phase E: Room Preset Tool                    | Not started                  |
| Phase F: Room Split Tool                     | Not started                  |

## Current Branch Update

The branch has implemented substantially more than the original status table described:

- Phase A GCS registration, synchronization, translation, constraint generation, movement, and solver validation are implemented.
- Perpendicular snapping to existing walls remains a Phase A gap; perpendicular snapping currently covers the active drawing chain.
- Phase B shared wall-entity storage, CRUD, geometry, split/merge handling, and cleanup are implemented. The dedicated entity-management UI described in B.6 remains incomplete; generic opening and post tools support intermediate walls.
- Phase C interior-wall assembly configuration, assignment, construction, segmentation, and 3D integration are implemented.
- Phases D, E, and F remain unimplemented: room detection, room labeling, room presets, and room splitting.

The implementation intentionally differs from some proposed names in this document. GCS uses the existing wall reference/non-reference primitives instead of a separate `intermediate_*` primitive family. Intermediate-wall geometry uses `entityReferenceLine` rather than `centerLine`, and intermediate walls require an interior assembly ID supplied by the default-assembly migration.

## Data Model

### Wall Nodes

Wall nodes are connection points for walls. Two types exist:

```typescript
// Node on a perimeter wall - position computed from wall geometry
interface PerimeterWallNode {
  id: WallNodeId
  perimeterId: PerimeterId
  type: 'perimeter'
  wallId: PerimeterWallId
  offsetFromCornerStart: Length
  connectedWallIds: IntermediateWallId[]
}

// Free-standing node - position stored directly
interface InnerWallNode {
  id: WallNodeId
  perimeterId: PerimeterId
  type: 'inner'
  position: Vec2
  connectedWallIds: IntermediateWallId[]
}
```

### Wall Attachments

Walls connect to nodes via attachments, which include axis alignment:

```typescript
type WallAxis = 'left' | 'right'

interface WallAttachment {
  nodeId: WallNodeId
  axis: WallAxis
}
```

### Intermediate Walls

Interior walls connect two wall nodes:

```typescript
interface IntermediateWall {
  id: IntermediateWallId
  perimeterId: PerimeterId
  entityIds: WallEntityId[]
  leftRoomId?: RoomId
  rightRoomId?: RoomId
  start: WallAttachment
  end: WallAttachment
  thickness: Length
  wallAssemblyId?: InteriorWallAssemblyId
}
```

### Wall Entities

Wall entities are already shared by perimeter and intermediate walls:

```typescript
interface BaseWallEntity {
  id: WallEntityId
  perimeterId: PerimeterId
  wallId: WallId
  type: 'opening' | 'post'
  centerOffsetFromWallStart: Length
  width: Length
}

// Opening and WallPost extend BaseWallEntity.
```

### Rooms

```typescript
type RoomType =
  | 'living-room'
  | 'kitchen'
  | 'dining-room'
  | 'bedroom'
  | 'bathroom'
  | 'wc'
  | 'hallway'
  | 'office'
  | 'storage'
  | 'utility'
  | 'service'
  | 'generic'

interface Room {
  id: RoomId
  perimeterId: PerimeterId
  wallIds: IntermediateWallId[] // Auto-detected
  type: RoomType
  counter: number // bedroom 1, bedroom 2, etc.
  customLabel?: string
}

interface RoomGeometry {
  boundary: Polygon2D
  area: Area
}
```

### Geometry Types

```typescript
interface WallNodeGeometry {
  center: Vec2
  boundary?: Polygon2D
}

interface InnerWallNodeGeometry extends WallNodeGeometry {
  // connectedWallIds remains on InnerWallNode.
}

interface IntermediateWallGeometry {
  boundary: Polygon2D
  centerLine: LineSegment2D
  wallLength: Length
  leftLength: Length
  leftLine: LineSegment2D
  rightLength: Length
  rightLine: LineSegment2D
  direction: Vec2
  leftDirection: Vec2
}
```

`leftLine`, `centerLine`, and `rightLine` are all meaningful geometry. Mixed attachment axes can produce different side spans, so the center line alone is not sufficient for GCS constraints.

## Completed Implementation (Phases 1-3)

### Store & Geometry (`src/building/store/slices/`)

- **`intermediateWallsSlice.ts`**: Full CRUD for walls and nodes
  - Wall actions: `addIntermediateWall`, `removeIntermediateWall`, `updateIntermediateWallThickness`, `updateIntermediateWallAlignment`
  - Node actions: `addPerimeterWallNode`, `addInnerWallNode`, `splitIntermediateWallAtPoint`, `removeWallNode`, `updateInnerWallNodePosition`, `updatePerimeterWallNodeOffset`
  - All getters: `getIntermediateWallById`, `getIntermediateWallsByPerimeter`, `getAllIntermediateWalls`, `getWallNodeById`, `getWallNodesByPerimeter`, `getAllWallNodes`
- **`intermediateWallGeometry.ts`**: Wall lines, corner computation, boundary polygons
- **`cleanup.ts`**: Orphan cleanup for intermediate walls, wall nodes, and constraints
- **Tests**: 853 lines (slice) + 458 lines (geometry) + cleanup tests

### Drawing Tool (`src/editor/tools/intermediate-wall/add/`)

- **`IntermediateWallTool.ts`** (457 lines): Multi-segment polyline drawing with:
  - Snapping to perimeter walls, existing intermediate walls, and wall nodes
  - Validation (inside perimeter, no crossing, minimum length)
  - Auto-creation of wall nodes (inner, perimeter, split on T-junction)
  - Length input override
  - Chain completion by clicking first point or pressing Enter
  - Perpendicular snapping within the chain (to previous segment direction)
- **`IntermediateWallToolInspector.tsx`**: Thickness field, length override, help text
- **`IntermediateWallToolOverlay.tsx`**: SVG overlay with snapped points, polyline segments, preview
- **Registered** in ToolSystem with hotkey `i`

### Select/Edit Support

- **Selectable**: Intermediate walls can be selected via `SelectTool`
- **Inspectable**: `IntermediateWallInspector` provides thickness editing, length display, delete
- **NOT movable**: No `IntermediateWallMovementBehavior` exists

---

# Phase A: Constraints for Intermediate Walls

## Goal

Enable the GCS (geometric constraint solver) to enforce constraints on intermediate walls, including:

- Wall length constraints
- Horizontal/vertical alignment constraints
- Perpendicular constraints between intermediate walls and perimeter/intermediate walls
- Node position constraints when attached to perimeter walls
- Wall entity position constraints on intermediate walls

## Current State

- **Constraint model** (`src/building/model/constraints.ts`): Already supports `IntermediateWallId` and `WallNodeId` as `ConstraintEntityId` in the reverse index
- **Constraint types**: `WallLengthConstraint`, `HorizontalWallConstraint`, `VerticalWallConstraint` etc. already accept `WallId` (which includes `IntermediateWallId`)
- **Constraint store** (`constraintsSlice.ts`): Wall split/merge constraint transfer already handles `WallId`
- GCS synchronization, constraint generation, and translator support are implemented through the existing perimeter rebuild and wall reference/non-reference abstractions.
- Wall entities are already implemented for intermediate walls and are not deferred to Phase B.

### Constraint Scope

Perimeter corner constraints remain perimeter-specific because perimeter corners have exactly two adjacent perimeter walls. Intermediate wall nodes need an explicit wall pair: a node with three or more connected walls cannot identify an angle, perpendicularity, or colinearity relationship from the node alone.

Node constraints therefore reference the node and both participating walls:

```typescript
interface WallNodePerpendicularConstraint {
  id: ConstraintId
  type: 'wallNodePerpendicular'
  node: WallNodeId
  wallA: WallId
  wallB: WallId
}

interface WallNodeColinearConstraint {
  id: ConstraintId
  type: 'wallNodeColinear'
  node: WallNodeId
  wallA: WallId
  wallB: WallId
}

interface WallNodeAngleConstraint {
  id: ConstraintId
  type: 'wallNodeAngle'
  node: WallNodeId
  wallA: WallId
  wallB: WallId
  angle: number
}
```

`wallA` and `wallB` must be connected to `node`. The constraint store and translator must index and validate the node and both walls.

## A.1: GCS Geometry Registration

### File: `src/building/gcs/store.ts`

Add intermediate wall geometry to the GCS:

```typescript
// New action: add geometry for an intermediate wall
addIntermediateWallGeometry(state, wallId: IntermediateWallId): void

// New action: remove geometry for an intermediate wall
removeIntermediateWallGeometry(state, wallId: IntermediateWallId): void

// Update existing: called when wall changes
updateIntermediateWallGeometry(state, wallId: IntermediateWallId): void
```

**GCS geometry scheme for intermediate walls:**

The center line is derived geometry; attachments target the left or right wall axis. For each intermediate wall, register endpoint points and lines for both attachment axes plus the derived center line:

```text
intermediate_{wallId}_{start|end}_{left|center|right}
intermediate_{wallId}_{left|center|right}
```

The endpoint selected by `WallAttachment.axis` is coincident with the corresponding attachment point at the wall node. Left and right are relative to each wall's direction, so they must not be represented as global node coordinates.

For each wall, register:

- Two attachment axis lines: left and right.
- The derived center line.
- Endpoint points for each attachment axis.
- Parallel constraints between the axis lines and center line.
- Thickness constraints between the center and side axes.
- Attachment-specific endpoint coincidence constraints.
- Entity points constrained to the intermediate wall center/reference line.

Constraints:

- For perimeter-attached nodes: constrain the node's attachment geometry to the perimeter wall geometry.
- For inner nodes: keep the node free unless a building constraint fixes or relates it.
- Use the selected left or right axis for endpoint coincidence.
- Use the appropriate axis line for wall length according to the requested constraint side.

### Extend `PerimeterRegistryEntry`

Add tracking for intermediate wall GCS elements within a perimeter:

```typescript
interface PerimeterRegistryEntry {
  // ... existing fields
  intermediateWallIds: IntermediateWallId[]
  wallNodeIds: WallNodeId[]
}
```

The registry must track all intermediate-wall axis points, lines, entity points, and structural constraints so upsert and removal cannot leave stale primitives.

## A.2: GCS Sync Subscriptions

### File: `src/building/gcs/gcsSync.ts`

Add subscriptions for intermediate wall changes:

```typescript
subscribeToIntermediateWalls(): void
// - On wall added: call addIntermediateWallGeometry
// - On wall removed: call removeIntermediateWallGeometry
// - On wall thickness/alignment changed: call updateIntermediateWallGeometry
// - On wall geometry changed (from node move): update GCS points

subscribeToWallNodes(): void
// - On node added: create GCS point, add attachment constraints
// - On node removed: remove GCS point and constraints
// - On node position/offset changed: update GCS point
// - For perimeter-attached nodes: add point-on-line to perimeter wall
```

## A.3: Constraint Translator Updates

### File: `src/building/gcs/constraintTranslator.ts`

Extend `TranslationContext` to handle intermediate walls:

```typescript
interface TranslationContext {
  // Existing perimeter support:
  getLineStartPointId(lineId: string): string | undefined
  getWallCornerIds(wallId: WallId): { startCornerId: PerimeterCornerId; endCornerId: PerimeterCornerId } | undefined
  getCornerAdjacentWallIds(cornerId: PerimeterCornerId): { previousWallId: WallId; nextWallId: WallId } | undefined
  getReferenceSide(cornerId: PerimeterCornerId): 'left' | 'right'

  // Intermediate wall support:
  getWallEndpoints(wallId: WallId): { start: NodeId; end: NodeId } | undefined
  getWallNodeGcsPointId(nodeId: WallNodeId): string | undefined
  getIntermediateWallGcsLineId(wallId: IntermediateWallId, axis: WallAxis): string | undefined
  getWallEndpointGcsPointId(wallId: IntermediateWallId, endpoint: 'start' | 'end', axis: WallAxis): string | undefined
  getWallNodeConnectedWalls(nodeId: WallNodeId): WallId[]
}
```

**Implementation in `store.ts`:**

```typescript
getWallEndpoints: (wallId: WallId) => {
  // Resolve perimeter corners or intermediate wall nodes here.
  return resolveWallEndpoints(wallId)
}

getWallNodeGcsPointId: (nodeId: WallNodeId) => {
  return `wallnode_${nodeId}`
}

getIntermediateWallGcsLineId: (wallId: IntermediateWallId, axis: WallAxis) => {
  return `intermediate_${wallId}_${axis}`
}
```

### Update constraint translation functions

- `translateWallLengthConstraint`: Handle `IntermediateWallId` by using its endpoint axis points instead of perimeter corners
- `translateHorizontalWallConstraint` / `translateVerticalWallConstraint`: Handle `IntermediateWallId` by constraining node positions
- `translateWallEntityAbsoluteConstraint` / `translateWallEntityRelativeConstraint`: Handle entities on intermediate walls using the center/reference axis
- Add translation for `wallNodePerpendicular`, `wallNodeColinear`, and `wallNodeAngle` using the explicitly selected wall pair

### New helper functions

```typescript
// In constraintTranslator.ts or a shared helpers file
function wallRefLineId(wallId: WallId): string {
  if (isPerimeterWallId(wallId)) return `wall_${wallId}_ref`
  return `intermediate_${wallId}_center`
}

function intermediateWallLineId(wallId: IntermediateWallId, axis: WallAxis): string {
  return `intermediate_${wallId}_${axis}`
}
```

## A.4: Constraint Generation for Intermediate Walls

### File: `src/building/gcs/constraintGenerator.ts`

Auto-generate constraints when intermediate walls are created:

```typescript
function generateIntermediateWallConstraints(
  createdWalls: IntermediateWallWithGeometry[],
  allWalls: IntermediateWallWithGeometry[],
  perimeterWalls: PerimeterWallWithGeometry[],
  nodes: WallNodeWithGeometry[],
  alignment: 'left' | 'right',
  lengthOverrides: ReadonlyMap<IntermediateWallId, Length | null>
): ConstraintInput[]
```

**Rules:**

1. **Length constraint**: An intermediate wall gets a `WallLengthConstraint` only when the drawing tool recorded an explicit length override. The constraint side is the drawing tool's selected `left` or `right` alignment.
2. **Horizontal/Vertical**: If wall direction is nearly horizontal (within 1mm) or vertical, add corresponding constraint
3. **Perpendicular to perimeter wall**: If an endpoint is attached to a perimeter wall and the intermediate wall is nearly perpendicular (within tolerance), add constraint
4. **Perpendicular to other wall**: For adjacent incident-wall pairs shown by the wall-node measurement badges, if the walls are nearly perpendicular, add a wall-node perpendicular constraint naming the node and both walls
5. **Colinear**: For adjacent incident-wall pairs shown by the wall-node measurement badges, if the walls are nearly colinear, add a wall-node colinear constraint naming the node and both walls

At a perimeter node, the two opposite perimeter rays represent one physical perimeter wall. When exactly one intermediate wall meets that node, show and generate one relationship rather than one relationship for each ray.

For nodes with more than two connected walls, evaluate wall pairs independently. Do not infer a single angle from the node or constrain every pair unless that relationship is intended by the constraint policy.

### When to generate

- After `addIntermediateWall`: Generate constraints for the new wall
- After `splitIntermediateWallAtPoint`: Regenerate constraints for the two new walls
- After wall endpoint attachment changes: Re-evaluate perpendicular/colinear relationships

## A.5: Perpendicular Snapping Enhancement

### File: `src/editor/tools/intermediate-wall/add/IntermediateWallTool.ts`

Currently only snaps perpendicular within the chain. Extend to snap perpendicular to existing walls:

**Strategy**: Add snap line candidates for perpendicular directions from existing wall endpoints.

When the user is drawing and has at least one placed point:

1. For each nearby perimeter wall: compute the perpendicular direction from the nearest point on the wall
2. For each nearby intermediate wall: compute the perpendicular direction from the nearest point on the wall
3. Add these as snap line candidates to the `SnappingService`

The `SnappingService` already handles line-line intersection snapping, so adding perpendicular snap lines will produce intersection points automatically.

### File: `src/editor/canvas/services/SnappingService.ts`

No changes needed to the snapping service itself - just add perpendicular snap line candidates from the tool.

## A.6: Wall Node and Intermediate Wall Movement Behavior

### File: `src/editor/tools/basic/movement/movementBehaviors.ts`

Wall nodes and intermediate walls are moved through temporary GCS drags. Only the
directly manipulated node or endpoint nodes remain free; all other perimeter
corners and wall nodes are fixed during the solve.

```typescript
class WallNodeMovementBehavior implements MovementBehavior {
  // On drag start: identify the node and all connected walls
  // On drag move: solve a temporary node drag and validate the candidate geometry
  // On drag end: commit solved node positions and recompute derived geometry
}
```

Register in movement behaviors:

```typescript
'wall-node': WallNodeMovementBehavior,
```

**Interaction with GCS**: Node movement drives the selected node. Intermediate-wall
movement attaches temporary points to both endpoints and applies the same delta to
both. Candidate positions must remain inside the perimeter and must not intersect
unrelated walls.

## A.7: Testing

- Test GCS point/line creation for intermediate walls
- Test constraint translation for intermediate wall constraints
- Test constraint generation (perpendicular, H/V, length)
- Test wall-node constraints with two and three or more connected walls
- Test all attachment-axis combinations and mixed-axis trapezoidal walls
- Test GCS sync subscription (add/remove/update intermediate walls)
- Test wall node movement with constraint enforcement
- Test perpendicular snapping to existing walls

---

## A.8: Remaining GCS Integration Gaps

The initial GCS geometry registration, constraint translation, model-to-GCS synchronization, and solved wall-node/entity synchronization are implemented. The following gaps remain tracked separately from movement behavior:

1. **Intermediate wall length translation**
   - Complete: intermediate walls use their requested left/right axis endpoint points directly.

2. **Constraint transfer during intermediate wall split/merge**
   - Complete for supported wall, wall-node, and wall-entity relationships.
   - Split transfers length, horizontal/vertical, parallel, endpoint wall-node, and same-segment entity constraints to the replacement walls.
   - Merge transfers compatible constraints to the merged wall and drops relationships that depend on the deleted internal node.
   - Splits and merges also maintain reverse-index entries and add the colinear constraint for a newly created split node.

3. **Multi-wall node constraint semantics**
   - A node with more than two connected walls requires an explicit wall pair for angle, perpendicular, and colinear constraints.
   - The solver registration must preserve the distinction between the node point and the selected wall-side endpoint points.
   - Additional regression coverage is needed for three-way and higher-degree nodes.

4. **Constraint stability across perimeter rebuilds**
   - `addPerimeterGeometry()` rebuilds all registered perimeter and intermediate primitives.
   - Translated building constraints must continue to reference valid recreated primitives after thickness, attachment, or entity changes.
   - Rebuild ordering and stale primitive handling need integration coverage.

5. **Movement integration**
   - GCS-backed `wall-node` and `intermediate-wall` movement behaviors are implemented.
   - Perimeter wall/corner commits also persist solved wall-node positions.
   - Manual interaction coverage remains useful for tuning the feel of constrained drags.

6. **Solved geometry validation**
   - Movement reuses the intermediate-wall drawing containment and intersection rules.
   - Invalid or non-finite solved positions are rejected before movement commits.

---

# Phase B: Wall Entities on Intermediate Walls (Completed)

## Goal

Enable full entity support (openings, posts) on intermediate walls, matching the feature set available on perimeter walls:

- Add/remove/update openings (door, window, passage) on intermediate walls
- Add/remove/update wall posts on intermediate walls
- Entity validation (fit within wall, no overlap)
- Entity geometry computation
- Entity splitting when walls are split
- Entity merging when walls are merged

## Current State

- **Entity model** (`src/building/model/wallEntities.ts`): `BaseWallEntity.wallId` already uses `WallId`.
- **Entity storage**: Shared records and actions are implemented in `wallEntitiesSlice.ts`.
- **Entity CRUD**: Generic opening and post actions accept perimeter or intermediate wall IDs.
- **Entity geometry**: Intermediate entities are computed from `entityReferenceLine`, `leftLine`, and `rightLine`.
- **Intermediate wall storage**: `IntermediateWall.entityIds` tracks both openings and posts.
- **Split/merge/cleanup**: Entity offsets, wall lists, and orphan cleanup are implemented.

## B.1: Entity Model

### File: `src/building/model/wallEntities.ts`

The model uses `WallId` directly. No `wallType` discriminator is required; wall ID prefixes and wall lookup determine the owning wall.

## B.2: Entity Storage Architecture

### Approach: Shared storage

Implemented in `wallEntitiesSlice.ts`: opening and post records, geometry caches, validation, and generic actions are shared. Actions accept `WallId`, including `IntermediateWallId`; no wall-type discriminator or slice-specific duplicate actions is required.

## B.3: Entity CRUD Actions

### In `src/building/store/slices/wallEntitiesSlice.ts`:

```typescript
// Generic actions accept WallId, including IntermediateWallId.
addWallOpening(wallId: WallId, params: OpeningParams): OpeningWithGeometry
removeWallOpening(openingId: OpeningId): void
updateWallOpening(openingId: OpeningId, updates: Partial<OpeningParams>): void
isWallOpeningPlacementValid(wallId: WallId, centerOffset, width, excluded?): boolean

// Wall post actions
addWallPost(wallId: WallId, params: WallPostParams): WallPostWithGeometry
removeWallPost(postId: WallPostId): void
updateWallPost(postId: WallPostId, updates: Partial<WallPostParams>): void
isWallPostPlacementValid(wallId: WallId, centerOffset, width, excluded?): boolean

// Validation helpers
isWallEntityPlacementValid(wallId: WallId, centerOffset, width, excluded?, options?): boolean
findNearestValidWallEntityPosition(wallId: WallId, preferredCenter, width, excluded?, options?): Length | null
```

**Validation logic**: Shared validation uses the target wall's geometry; intermediate walls use `centerLine` and their computed side lines.

## B.4: Entity Geometry Computation

### File: `src/building/store/slices/intermediateWallGeometry.ts`

Entity geometry computation for intermediate wall entities is implemented:

```typescript
function updateIntermediateWallEntityGeometry(
  state: IntermediateWallsState,
  wallId: IntermediateWallId,
  entityId: WallEntityId
): void
```

**Geometry computation**:

- Project entity position onto the intermediate wall's `centerLine`
- Compute entity polygon based on wall thickness (perpendicular offset from center line)
- Entity `insideLine` / `outsideLine` mapped to wall's `leftLine` / `rightLine`

## B.5: Entity Handling During Wall Split/Merge

### In `splitIntermediateWallAtPoint`:

When splitting an intermediate wall that has entities:

1. Compute which entities belong to each half (by `centerOffsetFromWallStart` vs split point)
2. Entities that straddle the split point: fail the split (return null) or remove the entity
3. Entities on the second half: adjust `centerOffsetFromWallStart` by subtracting the first half's length
4. Update `entityIds` arrays on both new walls

### In wall merge (future):

When merging two intermediate walls (removing a colinear node):

1. Combine entity lists from both walls
2. Adjust offsets on the second wall's entities by adding the first wall's length
3. Handle overlaps between entities from both walls

## B.6: Entity Inspector UI

### File: `src/editor/inspectors/IntermediateWallInspector.tsx`

Extend to show entity list and allow add/remove/edit:

- List of openings and posts on the selected wall
- Add opening/post buttons
- Click entity to select and show entity-specific inspector
- Reuse existing `OpeningInspector` / `WallPostInspector` components (adapted for intermediate wall context)

### File: `src/editor/inspectors/` (new or existing)

Add/edit entity modals adapted for intermediate walls:

- Opening type selector (door, window, passage)
- Width, height, sill height fields
- Assembly override selector

## B.7: Cleanup Integration

### File: `src/building/store/slices/cleanup.ts`

Ensure intermediate wall entity cleanup works correctly:

- When an intermediate wall is removed: remove all its entities
- When an entity is removed: remove from the owning wall's `entityIds` array
- When a perimeter is removed: cascade to intermediate walls and their entities

## B.8: Testing

- Test add/remove/update opening on intermediate wall
- Test add/remove/update wall post on intermediate wall
- Test entity validation (fit, overlap)
- Test entity geometry computation
- Test entity handling during wall split
- Test cleanup cascade for intermediate wall entities

---

# Phase C: Interior Wall Assembly System

## Goal

Enable configurable wall assemblies for intermediate walls with 3D construction, starting with a simple monolithic assembly and expanding to match the perimeter wall assembly types.

## Current State

- **`InteriorWallAssemblyId`**: Implemented with the `iwa_*` prefix.
- **`IntermediateWall.wallAssemblyId`**: Required and migrated to the default interior assembly when missing or invalid.
- **Config store**: Implemented in `src/config/store/slices/interiorWalls.ts` with defaults and usage tracking.
- **Assembly interface**: Implemented for `IntermediateWallWithGeometry` with perimeter construction context.
- **Segmentation**: Implemented independently from perimeter-wall segmentation.
- **3D builder**: `buildIntermediateWallCoreModel()` and composite integration are implemented.

## C.1: Interior Wall Assembly Config

### File: `src/config/types.ts`

Add config types for interior wall assemblies:

```typescript
interface InteriorWallAssemblyConfig {
  type: InteriorWallAssemblyType
  insideLayerSetId?: LayerSetId
  outsideLayerSetId?: LayerSetId
  openingAssemblyId?: OpeningAssemblyId
}

type InteriorWallAssemblyType = 'monolithic' | 'framed' | 'solid' | 'module'

interface MonolithicInteriorWallConfig extends InteriorWallAssemblyConfig {
  type: 'monolithic'
  material: MaterialId
  coreThickness: Length
}

interface FramedInteriorWallConfig extends InteriorWallAssemblyConfig {
  type: 'framed'
  studSpacing: Length
  studMaterial: MaterialId
  infillMaterial: MaterialId
  claddingInside?: LayerSetId
  claddingOutside?: LayerSetId
}

// ... more types as needed
```

### File: `src/config/store/slices/interiorWalls.ts` (new)

Config store slice following the established pattern:

```typescript
interface InteriorWallAssembliesState {
  interiorWallAssemblies: Record<InteriorWallAssemblyId, InteriorWallAssemblyConfig>
  defaultInteriorWallAssemblyId: InteriorWallAssemblyId | null
}

interface InteriorWallAssembliesActions {
  addInteriorWallAssembly(config: Omit<InteriorWallAssemblyConfig, 'id'>): InteriorWallAssemblyId
  removeInteriorWallAssembly(id: InteriorWallAssemblyId): void
  updateInteriorWallAssemblyConfig(id: InteriorWallAssemblyId, updates: Partial<InteriorWallAssemblyConfig>): void
  updateInteriorWallAssemblyName(id: InteriorWallAssemblyId, name: string): void
  duplicateInteriorWallAssembly(id: InteriorWallAssemblyId): InteriorWallAssemblyId
  getInteriorWallAssemblyById(id: InteriorWallAssemblyId): InteriorWallAssemblyConfig | undefined
  getAllInteriorWallAssemblies(): InteriorWallAssemblyConfig[]
  setDefaultInteriorWallAssembly(id: InteriorWallAssemblyId): void
  getDefaultInteriorWallAssembly(): InteriorWallAssemblyConfig | undefined
  resetToDefaults(): void
}
```

### File: `src/config/store/slices/interiorWalls.defaults.ts` (new)

Default assemblies:

```typescript
const defaultInteriorWallAssemblies = [
  {
    id: createInteriorWallAssemblyId(),
    name: 'Monolithic 100mm',
    type: 'monolithic' as const,
    material: 'straw',
    coreThickness: fromMillimeters(100)
  }
  // ... more defaults
]

const defaultInteriorWallAssemblyId = defaultInteriorWallAssemblies[0].id
```

## C.2: Interior Wall Assembly Interface

### File: `src/construction/assemblies/interiorWalls/types.ts` (new)

```typescript
interface InteriorWallAssembly {
  construct(wall: IntermediateWallWithGeometry, storeyContext: StoreyContext): ConstructionModel
  get tag(): Tag
  get thicknessRange(): ThicknessRange
  getCorePhysicsStructure(coreThickness: Length, height: Length): PhysicsSeries[]
  getPhysicsStructure(totalThickness: Length, height: Length): AssemblyPhysicsStructure
}
```

**Note**: Uses `IntermediateWallWithGeometry` instead of `PerimeterWallWithGeometry`.

### File: `src/construction/assemblies/interiorWalls/monolithic.ts` (new)

First assembly implementation:

```typescript
class MonolithicInteriorWallAssembly implements InteriorWallAssembly {
  constructor(private config: MonolithicInteriorWallConfig) {}

  construct(wall: IntermediateWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    // Create a simple rectangular cuboid for the wall
    // Use wall.centerLine for position, wall.thickness for width
    // Use storey context for height
    // Handle entities (openings/posts) by cutting voids or adding sub-areas
  }
}
```

### File: `src/construction/assemblies/interiorWalls/index.ts` (new)

```typescript
function resolveInteriorWallAssembly(config: InteriorWallAssemblyConfig): InteriorWallAssembly {
  switch (config.type) {
    case 'monolithic':
      return new MonolithicInteriorWallAssembly(config)
    case 'framed':
      return new FramedInteriorWallAssembly(config)
    // ...
  }
}
```

## C.3: Interior Wall Segmentation

### File: `src/construction/assemblies/interiorWalls/segmentation.ts` (new)

Simplified segmentation for intermediate walls (no corner extensions):

```typescript
function* segmentedInteriorWallConstruction(
  wall: IntermediateWallWithGeometry,
  storeyContext: StoreyContext,
  wallConstruction: WallSegmentConstruction,
  openingAssemblyId?: OpeningAssemblyId
): Generator<ConstructionResult>
```

**Key differences from perimeter wall segmentation:**

- No corner extensions (walls attach to wall nodes, not perimeter corners)
- Uses `centerLine` for positioning (perimeter uses `innerLine`)
- Simpler wall area calculation (no reference side concept)
- Entity positions along `centerLine` instead of `innerLine`
- Height from storey context (no roof integration for interior walls)

**Entity handling:**

- Same pattern as perimeter: iterate through sorted entities, construct segments between them
- Openings cut voids in the wall
- Posts are sub-areas within the wall

## C.4: 3D Construction Builder

### File: `src/construction/store/builders.ts`

Add intermediate wall construction:

```typescript
function buildIntermediateWallCoreModel(wallId: IntermediateWallId): CoreModel {
  const wall = getIntermediateWallById(wallId)
  const perimeter = getPerimeterById(wall.perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)

  const assemblyConfig = wall.wallAssemblyId
    ? getInteriorWallAssemblyById(wall.wallAssemblyId)
    : getDefaultInteriorWallAssembly()

  if (!assemblyConfig) return emptyCoreModel()

  const assembly = resolveInteriorWallAssembly(assemblyConfig)
  const wallModel = assembly.construct(wall, storeyContext)
  return { model: wallModel, tags: [...], sourceId: wall.id }
}
```

### Integration with composite builders

Update composite builders to include intermediate walls:

```typescript
// In buildPerimeterComposite:
// Add intermediate wall transforms alongside perimeter wall transforms

// In buildStoreyComposite:
// Include intermediate walls for each perimeter in the storey
```

## C.5: Assembly Assignment in Inspector

### File: `src/editor/inspectors/IntermediateWallInspector.tsx`

Add assembly selector dropdown:

```tsx
// Assembly field
<AssemblySelect
  value={wall.wallAssemblyId}
  onChange={assemblyId => store.dispatch.updateIntermediateWallAssembly(wall.id, assemblyId)}
  assemblies={getAllInteriorWallAssemblies()}
/>
```

### Store action

```typescript
// In intermediateWallsSlice.ts:
updateIntermediateWallAssembly(wallId: IntermediateWallId, assemblyId: InteriorWallAssemblyId): void
```

## C.6: Testing

- Test config store CRUD for interior wall assemblies
- Test monolithic assembly construction (basic cuboid)
- Test assembly construction with openings
- Test assembly construction with posts
- Test 3D builder integration
- Test assembly assignment via inspector

---

# Phase D: Room Detection & Labeling

## Goal

Automatically detect rooms from closed wall loops and allow users to assign room types and labels.

## Current State

- **`Room` model type**: Defined in `rooms.ts` with `RoomType` enum
- **`RoomId`**: Defined in `ids.ts` but commented out of `SelectableId`
- **`Perimeter.roomIds`**: Always `[]`
- **`IntermediateWall.leftRoomId` / `rightRoomId`**: TODO placeholders
- **No detection algorithm exists**

## D.1: Room Detection Algorithm

### File: `src/building/store/slices/roomDetection.ts` (new)

The algorithm detects rooms from the wall graph topology:

### Input

For a given perimeter:

1. Collect all wall segments forming the boundary:
   - Perimeter wall segments (each `PerimeterWall` becomes 1-2 segments depending on intermediate wall attachment points)
   - Intermediate wall segments (each `IntermediateWall` is 1 segment)
2. Build a planar graph: nodes are wall endpoints (corners + wall nodes), edges are wall segments
3. Identify all minimal cycles (faces) in the planar graph

### Algorithm

```
function detectRooms(perimeterId: PerimeterId): Room[]:
  // 1. Build edge list
  edges = []
  for each perimeter wall:
    add edge from wall start corner to wall end corner
    // If intermediate wall nodes exist on this wall, split the edge
    for each PerimeterWallNode on this wall (sorted by offset):
      split edge at node position

  for each intermediate wall:
    add edge from start node to end node

  // 2. Build planar graph
  graph = PlanarGraph.fromEdges(edges)

  // 3. Find all minimal cycles (faces)
  faces = graph.findMinimalCycles()

  // 4. Filter out the outer face (the perimeter itself)
  //    The outer face contains all other faces
  outerFace = face with largest area
  rooms = faces.filter(f => f !== outerFace)

  // 5. Compute room geometry
  for each room:
    boundary = Polygon2D from cycle vertices
    area = polygonArea(boundary)

  return rooms
```

### Cycle Detection Approach

Use the **dual graph** approach for planar subdivision:

1. Build adjacency graph from edges
2. For each directed edge, find the minimal cycle by following the "next edge" (leftmost turn at each vertex)
3. This naturally enumerates all faces of the planar subdivision
4. Filter to keep only interior faces (rooms), not the exterior face

### Incremental Updates

Room detection should run:

- After any intermediate wall is added/removed/split
- After any wall node is added/removed/moved
- After perimeter geometry changes

**Optimization**: Only re-detect rooms for the affected perimeter.

## D.2: Room Store Slice

### File: `src/building/store/slices/roomsSlice.ts` (new)

```typescript
interface RoomsState {
  rooms: Record<RoomId, Room>
  _roomGeometry: Record<RoomId, RoomGeometry>
}

interface RoomsActions {
  // Internal (called by intermediate wall/perimeter mutations):
  _detectRoomsForPerimeter(perimeterId: PerimeterId): void
  _updateRoomLeftRight(wallId: IntermediateWallId): void

  // User actions:
  updateRoomType(roomId: RoomId, type: RoomType): void
  updateRoomCustomLabel(roomId: RoomId, label: string): void

  // Getters:
  getRoomById(id: RoomId): RoomWithGeometry | undefined
  getRoomsByPerimeter(perimeterId: PerimeterId): RoomWithGeometry[]
  getAllRooms(): RoomWithGeometry[]
}
```

### Room Geometry Computation

```typescript
function updateRoomGeometry(state: RoomsState, roomId: RoomId): void {
  const room = state.rooms[roomId]
  // Boundary is computed during detection
  const boundary = room.boundary // Polygon2D from cycle vertices
  const area = polygonArea(boundary)
  state._roomGeometry[roomId] = { boundary, area }
}
```

### Left/Right Room Assignment

After room detection, assign rooms to wall sides:

```typescript
function assignRoomsToWalls(state: RoomsState, perimeterId: PerimeterId): void {
  const rooms = getRoomsByPerimeter(perimeterId)
  const walls = getIntermediateWallsByPerimeter(perimeterId)

  for (const wall of walls) {
    const wallMidpoint = lineSegmentMidpoint(wall.geometry.centerLine)
    const wallNormal = wall.geometry.direction // perpendicular to center line

    for (const room of rooms) {
      if (pointInPolygon(wallMidpoint + wallNormal * epsilon, room.geometry.boundary)) {
        wall.leftRoomId = room.id
      } else if (pointInPolygon(wallMidpoint - wallNormal * epsilon, room.geometry.boundary)) {
        wall.rightRoomId = room.id
      }
    }
  }
}
```

### Integration with Perimeter

Update `Perimeter.roomIds` when rooms are detected:

```typescript
// In perimeterSlice or roomsSlice:
perimeter.roomIds = rooms.filter(r => r.perimeterId === perimeterId).map(r => r.id)
```

## D.3: Room Detection Triggers

Room detection runs automatically after mutations:

```typescript
// In intermediateWallsSlice.ts - after wall/node mutations:
// Call roomsSlice._detectRoomsForPerimeter(perimeterId)

// In perimeterSlice.ts - after perimeter geometry changes:
// Call roomsSlice._detectRoomsForPerimeter(perimeterId)
```

**Debounce**: If multiple mutations happen in quick succession (e.g., drawing a chain of walls), debounce room detection to run only after the last mutation.

## D.4: Room Selection

### File: `src/building/model/ids.ts`

Uncomment `RoomId` from `SelectableId`:

```typescript
type SelectableId =
  | PerimeterId
  | PerimeterCornerId
  | PerimeterWallId
  | IntermediateWallId
  | WallNodeId
  | OpeningId
  | WallPostId
  | RoomId // <-- Uncomment
```

### File: `src/editor/canvas/layers/rooms/RoomShape.tsx` (new)

SVG rendering for rooms:

```tsx
function RoomShape({ roomId }: { roomId: RoomId }) {
  const room = useRoomById(roomId)
  if (!room) return null

  return (
    <g data-entity-id={roomId} data-entity-type="room">
      <polygon
        points={polygonToSvgPoints(room.geometry.boundary)}
        fill={getRoomTypeColor(room.type)}
        fillOpacity={0.15}
        stroke={getRoomTypeColor(room.type)}
        strokeWidth={1}
      />
      <text x={centroid.x} y={centroid.y}>
        {room.customLabel || getRoomTypeLabel(room.type, room.counter)}
      </text>
    </g>
  )
}
```

### Canvas layer integration

Add room rendering as a background layer below walls.

## D.5: Room Labeling UI

### File: `src/editor/inspectors/RoomInspector.tsx` (new)

Inspector for selected rooms:

```tsx
function RoomInspector({ roomId }: { roomId: RoomId }) {
  const room = useRoomById(roomId)
  const [type, setType] = useState(room.type)
  const [label, setLabel] = useState(room.customLabel)

  return (
    <div>
      <h3>Room</h3>

      <div>
        <label>Type</label>
        <select
          value={type}
          onChange={e => {
            setType(e.target.value)
            store.dispatch.updateRoomType(roomId, e.target.value)
          }}
        >
          {RoomType.options.map(t => (
            <option key={t} value={t}>
              {formatRoomType(t)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Custom Label</label>
        <input
          value={label}
          onChange={e => {
            setLabel(e.target.value)
            store.dispatch.updateRoomCustomLabel(roomId, e.target.value)
          }}
        />
      </div>

      <div>
        <label>Area</label>
        <span>{formatArea(room.geometry.area)}</span>
      </div>
    </div>
  )
}
```

### File: `src/editor/tools/basic/SelectToolInspector.tsx`

Add room handling:

```tsx
{
  selectedId && isRoomId(selectedId) && <RoomInspector key={selectedId} roomId={selectedId} />
}
```

## D.6: Counter Management

Room counters (e.g., "Bedroom 1", "Bedroom 2") need to be managed:

```typescript
// When room type changes:
function getNextCounter(perimeterId: PerimeterId, roomType: RoomType, excludeRoomId?: RoomId): number {
  const rooms = getRoomsByPerimeter(perimeterId)
  const existing = rooms.filter(r => r.type === roomType && r.id !== excludeRoomId).map(r => r.counter)
  return existing.length > 0 ? Math.max(...existing) + 1 : 1
}

// When a room is deleted or type changed:
// Re-number remaining rooms of the same type to fill gaps
```

## D.7: Testing

- Test cycle detection on simple rectangular room (4 perimeter walls + 2 intermediate walls)
- Test cycle detection on L-shaped room
- Test cycle detection with T-junctions
- Test detection when rooms share a wall
- Test left/right room assignment
- Test room geometry computation (area)
- Test incremental detection after wall add/remove/split
- Test counter management
- Test room type labeling
- Test room selection

---

# Phase E: Room Preset Tool

## Goal

Place rectangular room presets inside an existing perimeter. The user configures dimensions and room type in a dialog, then clicks a position on the canvas where the room walls snap to existing walls.

## Prerequisites

- Phase D (Room Detection) must be complete for room creation
- Phase C (Assemblies) should be complete for wall assembly assignment

## E.1: Tool Concept

**Interaction flow:**

1. User activates the room preset tool
2. Inspector shows a dialog with: width, length, wall thickness, wall assembly, room type
3. After confirming dimensions, the tool enters canvas placement mode
4. A ghost rectangle follows the cursor, snapped to nearby walls
5. User clicks to place the room
6. Intermediate walls are created for sides that don't align with existing walls
7. Room detection runs, creating the new room with the configured type

**Snapping behavior:**

- Each side of the rectangle snaps to nearby existing walls (perimeter or intermediate)
- If a side aligns with an existing wall, no new wall is created for that side
- If a corner snaps to an existing wall node, reuse that node
- If a corner is free, create an inner wall node
- If a corner snaps to a perimeter wall midpoint, create a perimeter wall node

## E.2: Room Preset Config

### File: `src/editor/tools/room/preset/types.ts` (new)

```typescript
interface RoomPresetConfig {
  width: Length // Interior width
  length: Length // Interior length
  thickness: Length // Wall thickness
  wallAssemblyId?: InteriorWallAssemblyId
  roomType: RoomType
  customLabel?: string
}
```

## E.3: RoomPresetTool

### File: `src/editor/tools/room/preset/RoomPresetTool.ts` (new)

Two-phase tool: dialog phase then placement phase.

```typescript
class RoomPresetTool extends BaseTool {
  private config: RoomPresetConfig | null = null
  private placementMode: boolean = false

  // Phase 1: Dialog (handled by inspector component)
  // Inspector shows config fields, "Place" button sets this.config and placementMode = true

  // Phase 2: Canvas placement
  handlePointerMove(position: Vec2): void {
    // Compute ghost rectangle at cursor position
    // Snap rectangle edges to nearby walls
    // Render preview via overlay
  }

  handlePointerDown(position: Vec2): void {
    // 1. Determine which sides of the rectangle align with existing walls
    // 2. For sides needing new walls:
    //    a. Compute start/end nodes (snap to existing nodes or create new ones)
    //    b. Create intermediate walls
    // 3. Run room detection for the perimeter
    // 4. Set the new room's type to config.roomType
    // 5. Pop tool
  }
}
```

## E.4: Snapping Logic

The ghost rectangle has 4 edges. For each edge:

1. **Check alignment with existing walls**: Project the edge onto nearby walls. If the edge is colinear with an existing wall and within snap distance, snap to it.
2. **Corner snapping**: Each corner snaps to:
   - Existing wall nodes (highest priority)
   - Perimeter wall midpoints (creates perimeter wall node)
   - Other intermediate wall midpoints (triggers split)
   - Free position (creates inner wall node)
3. **Dimension preservation**: When one edge snaps to an existing wall, the perpendicular edges may need to adjust to maintain the configured width/length. The user can toggle between "preserve dimensions" and "stretch to fit" modes.

## E.5: Wall Creation Strategy

After placement, determine which walls need to be created:

```
for each side of the rectangle:
  if side fully aligns with an existing wall:
    // No new wall needed - existing wall becomes a room boundary
    // Update room detection will pick this up
  else if side partially aligns with an existing wall:
    // Create intermediate wall for the non-aligned portion
    // Snap endpoints to existing wall nodes or create new ones
  else:
    // Create full intermediate wall for this side
    // Snap endpoints to nearest nodes or create new ones
```

## E.6: Inspector Component

### File: `src/editor/tools/room/preset/RoomPresetToolInspector.tsx` (new)

```tsx
function RoomPresetToolInspector({ tool }: Props) {
  // Dimension fields (width, length, thickness)
  // Wall assembly selector
  // Room type selector (dropdown of RoomType values)
  // Custom label input
  // "Place" button → enters placement mode
  // Help text for placement phase
}
```

## E.7: Overlay Component

### File: `src/editor/tools/room/preset/RoomPresetToolOverlay.tsx` (new)

SVG overlay rendering:

- Ghost rectangle with dashed lines
- Color-coded edges: green for snapped-to-existing, gray for new walls
- Dimension labels on edges
- Room type label at center
- Snap indicators at corners

## E.8: Testing

- Test dialog configuration and validation
- Test snapping to perimeter walls (full and partial alignment)
- Test snapping to existing wall nodes
- Test wall creation (new walls vs reusing existing)
- Test room detection after placement
- Test room type assignment
- Test placement that requires T-junction splits

---

# Phase F: Room Split Tool

## Goal

Split an existing room by placing a wall across it, creating two new rooms. The user clicks a position inside the room and the split wall is placed horizontally or vertically through that point.

## Prerequisites

- Phase D (Room Detection) must be complete
- Phase A (Constraints) recommended for wall constraint generation

## F.1: Tool Concept

**Interaction flow:**

1. User activates the room split tool
2. Inspector shows: wall thickness, wall assembly, split orientation (horizontal/vertical)
3. User hovers over a room → the room highlights
4. A preview line appears through the room at the cursor position (horizontal or vertical)
5. The preview line snaps to align with existing wall nodes on the opposite walls
6. User clicks to place the split wall
7. The split wall is created, room detection runs, producing two rooms

**Split orientation:**

- Default: horizontal (wall runs left-right)
- Toggle: vertical (wall runs top-bottom) — via modifier key (e.g., Shift) or inspector toggle
- Auto-detect: based on room proportions (wider rooms get horizontal splits, taller rooms get vertical)

## F.2: Split Computation

### File: `src/editor/tools/room/split/roomSplitGeometry.ts` (new)

```typescript
interface RoomSplitResult {
  wallStart: Vec2 // Start point of the split wall
  wallEnd: Vec2 // End point of the split wall
  startSnap: SnapTarget // What the start snaps to
  endSnap: SnapTarget // What the end snaps to
  roomAPolygon: Polygon2D // Boundary of room A
  roomBPolygon: Polygon2D // Boundary of room B
}

type SnapTarget =
  | { type: 'wall-node'; nodeId: WallNodeId }
  | { type: 'perimeter-wall'; wallId: PerimeterWallId; offset: Length }
  | { type: 'intermediate-wall-midpoint'; wallId: IntermediateWallId; point: Vec2 }

function computeRoomSplit(
  room: RoomWithGeometry,
  position: Vec2,
  orientation: 'horizontal' | 'vertical',
  snapCandidates: SnapTarget[]
): RoomSplitResult
```

**Algorithm:**

1. Determine the split line: horizontal or vertical line through `position`, clipped to the room boundary
2. Find where the split line intersects the room boundary walls
3. For each intersection point, determine the snap target (existing node, perimeter wall, or intermediate wall midpoint)
4. If snapping to an intermediate wall midpoint, plan a split (T-junction)
5. Compute the two resulting room polygons by splitting the original room boundary along the split line

## F.3: RoomSplitTool

### File: `src/editor/tools/room/split/RoomSplitTool.ts` (new)

```typescript
class RoomSplitTool extends BaseTool {
  private orientation: 'horizontal' | 'vertical' = 'horizontal'
  private hoveredRoomId: RoomId | null = null
  private splitResult: RoomSplitResult | null = null

  handlePointerMove(position: Vec2): void {
    // 1. Determine which room the cursor is in
    this.hoveredRoomId = findRoomAtPoint(position)
    if (!this.hoveredRoomId) {
      this.splitResult = null
      return
    }

    // 2. Compute split preview
    this.splitResult = computeRoomSplit(room, position, this.orientation, snapCandidates)
  }

  handlePointerDown(position: Vec2): void {
    if (!this.hoveredRoomId || !this.splitResult) return

    // 1. Create start node (snap or new)
    const startNodeId = getOrCreateNode(this.splitResult.startSnap)

    // 2. Create end node (may trigger intermediate wall split)
    const endNodeId = getOrCreateNode(this.splitResult.endSnap)

    // 3. Create the split wall
    addIntermediateWall({
      perimeterId: room.perimeterId,
      start: { nodeId: startNodeId, axis: 'left' },
      end: { nodeId: endNodeId, axis: 'left' },
      thickness: this.thickness,
      wallAssemblyId: this.assemblyId
    })

    // 4. Room detection runs automatically, producing two rooms
  }

  handleKeyDown(key: string): void {
    // Shift toggles orientation
    if (key === 'Shift') {
      this.orientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal'
    }
  }
}
```

## F.4: Inspector Component

### File: `src/editor/tools/room/split/RoomSplitToolInspector.tsx` (new)

```tsx
function RoomSplitToolInspector({ tool }: Props) {
  return (
    <div>
      <h3>Split Room</h3>
      <LengthField label="Wall thickness" value={thickness} onChange={...} />
      <AssemblySelect label="Wall assembly" value={assemblyId} onChange={...} />
      <OrientationToggle value={orientation} onChange={...} />
      <div className="help">
        <p>Hover over a room and click to split</p>
        <p>Hold Shift to toggle orientation</p>
        <p>Press Escape to cancel</p>
      </div>
    </div>
  )
}
```

## F.5: Overlay Component

### File: `src/editor/tools/room/split/RoomSplitToolOverlay.tsx` (new)

SVG overlay rendering:

- Highlight the hovered room (lighter fill)
- Draw the split preview line (dashed, color-coded by orientation)
- Draw snap indicators at endpoints
- Show dimension labels for the two resulting sub-rooms
- Show area labels for each sub-room

## F.6: Edge Cases

- **Split through an existing intermediate wall**: The split line may cross an existing intermediate wall. In this case, create a T-junction (split the existing wall) and create two wall segments for the split.
- **Split at an existing wall node**: If the split line passes through an existing wall node, use that node directly — the result is more than two rooms (e.g., splitting one room into three if a wall node is on the split line).
- **Split against perimeter wall**: Endpoints on perimeter walls create perimeter wall nodes.
- **Very thin resulting room**: Warn if one of the resulting rooms would be below a minimum area threshold.

## F.7: Testing

- Test horizontal split of rectangular room
- Test vertical split of rectangular room
- Test split with snapped endpoints to existing nodes
- Test split with endpoints on perimeter walls
- Test split through existing intermediate wall (T-junction)
- Test split at existing wall node (creating 3 rooms)
- Test orientation toggle (Shift key)
- Test room detection after split
- Test minimum area validation
- Test split of L-shaped room

---

# Review Follow-ups

These are implementation follow-ups identified while reviewing the feature branch against this document.

## Completed or Reclassified

- **Colinear wall grouping wrap-around bug**: Fixed in `src/construction/store/builders.ts`.
- **Movement validation helper**: Reclassified as obsolete. `GcsService.applySolution()` calls `src/building/gcs/validator.ts`, which is the active solver validation path. The unused editor-side validation context and helper code were removed.
- **Zero-length wall creation**: Reviewed and currently considered acceptable for the supported drawing flow; no follow-up is tracked here.
- **Assembly deletion protection**: Reviewed and currently considered acceptable because the configuration UI enforces usage protection; no follow-up is tracked here.

## TODO

- [x] Include interior-wall assemblies in layer-set usage tracking so layer sets referenced only by interior walls cannot be treated as unused.
- [x] Validate the effective endpoint produced by a drawing length override, not only the pointer/snap position.
- [x] Validate perimeter wall ownership, finiteness, and range when creating or updating perimeter wall nodes.
- [x] Validate all opening fields on update, including width, height, sill height, and center offset.
- [x] Add regression coverage for the four items above.
- [ ] Add direct regression coverage for three-way and higher-degree wall-node geometry, mixed attachment axes, and perimeter rebuild ordering.
- [ ] Add the dedicated intermediate-wall entity list and editing controls described in Phase B.6.
