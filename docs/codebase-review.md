# Strawbaler Codebase Review

## Overview
- React 19 single-page app that loads the editor shell via suspense (`src/app/App.tsx`) and bootstraps theming, material styling, and service worker support in `src/app/main.tsx`.
- Core state lives in Zustand stores with undo/redo, local persistence, and configuration repositories for materials, slabs, ring beams, and perimeter construction methods.
- Editors present a 2D plan canvas (Konva) backed by a modular tool system and provide SVG construction plans plus a Three.js 3D viewer generated from construction models.
- Business logic focuses on generating wall segments, openings, ring beams, and slabs for strawbale-centric construction strategies before merging them into renderable construction models.

## Architecture

### Application Shell
- `src/app/App.tsx` lazy-loads the editor while prefetching chunks via `startChunkPreloading` and shows a skeleton during suspense.
- `src/app/main.tsx` wires Radix + next-themes providers, injects dynamic material CSS, subscribes to material updates, and registers the Workbox-powered service worker for offline readiness.
- Vite configuration (`vite.config.ts`) adds custom HTML transforms for non-blocking CSS, PWA caching via `vite-plugin-pwa`, and manual chunking to isolate large vendors (React, Konva, Turf, Three).

### State & Persistence
- The building model store (`src/building/store/index.ts:42`) combines slices for storeys and perimeters, wraps them with `immer` for ergonomic mutations, persists state to `localStorage`, and layers undo/redo through `zundo`.
- Perimeter geometry and wall data are maintained in `src/building/store/slices/perimeterSlice.ts`, which recalculates wall directions, offsets, openings, and corner metadata whenever topology changes.
- Storey management lives in `src/building/store/slices/storeysSlice.ts`, enforcing positive heights, preserving a default ground floor, and exposing helpers such as `adjustAllLevels`.
- Configuration data (materials, wall methods, slabs, ring beams) is centralized in `src/construction/config/store.ts`, persisted with Zustand middleware, and exposed through hooks/context (`ConfigurationModalContext`).
- Materials have their own store (`src/construction/materials/store.ts`) seeded with defaults, validated for dimensional sanity, and used both for rendering and CSS generation (`materialCSS.ts`).

### Editor Experience
- `src/editor/FloorPlanEditor.tsx` orchestrates the layout: toolbar, configuration modal, welcome modal, Konva stage, side inspector, and status bar. It manages viewport sizing, keyboard shortcuts, and focus handling.
- Canvas rendering is handled by `FloorPlanStage` (`src/editor/canvas/layers/FloorPlanStage.tsx`), which translates Konva events into tool actions, supports wheel/pinch zoom, panning, and keeps pointer state in sync.
- The tool system (`src/editor/tools/system/store.ts`) maintains a stack of active tools, offers programmatic push/pop/replace APIs, and routes pointer events to tool implementations described in `metadata.ts`.
- Side panels and tool inspectors render tool-specific UI by reading the active tool’s inspector component (`src/editor/SidePanel.tsx`).

### Construction Rendering
- `constructModel` (`src/construction/storey.ts:14`) walks ordered storeys, builds each perimeter via `constructPerimeter`, applies vertical offsets determined by slab configs, and merges results into a single `ConstructionModel`.
- `constructPerimeter` (`src/construction/perimeter.ts:13`) retrieves the relevant storey, resolves construction methods, builds ring beams, constructs each wall via strategy-specific handlers, and then creates the slab footprint.
- 2D plan rendering lives in `src/construction/components/ConstructionPlan.tsx`, projecting `ConstructionModel` elements into SVG, layering highlighted areas, errors, warnings, and auto-generated measurements.
- The 3D viewer (`src/construction/viewer3d/ConstructionViewer3D.tsx`) renders the same construction model using `@react-three/fiber`, with orbit controls, grid helper, opacity controls, and export tooling.

### Shared Utilities & Services
- Geometry utilities in `src/shared/geometry` provide branded lengths, vector math (powered by gl-matrix), polygon validations (Turf), offsets, and helpers for computing measurement baselines.
- Chunk preloading (`src/shared/services/chunkPreloader.ts`) opportunistically prefetches non-entry bundles post-load using `requestIdleCallback`.
- Import/export support (`src/shared/services/ProjectImportExportService.ts`) serializes building and configuration stores, manages version compatibility, and reconstructs perimeters with regenerated IDs.
- Tailwind is used mainly for base styles while Radix Themes and CSS variables drive theming; `CanvasThemeContext` reads those variables for canvas/SVG consumers.

## Construction Business Logic

### Perimeter Geometry & Model Foundation
- Perimeter creation and mutation (`src/building/store/slices/perimeterSlice.ts:170`) generate walls and corners from polygon boundaries, prevent self-intersections (Turf `kinks`), and recalculate wall vectors, offsets, and angles through `updatePerimeterGeometry` (`src/building/store/slices/perimeterSlice.ts:953`).
- Corner removal, wall splitting/merging, and opening validation are all handled in the same slice, guaranteeing consistent geometry before construction routines consume the data.

### Wall Segmentation & Construction Strategies
- `segmentedWallConstruction` (`src/construction/walls/segmentation.ts:180`) calculates corner extensions, floor/ceiling offsets, plate areas, and partitions each wall into wall segments and opening segments. It emits highlighted areas (corners, plates, floor levels) and measurement tags.
- Infill walls (`src/construction/walls/infill/infill.ts:6`) recursively place straw bales and posts while respecting max spacing/min straw space, generate measurement tags, and flag insufficient room via warnings/errors.
- Strawhenge/module strategies (`src/construction/walls/strawhenge/strawhenge.ts:18`, `src/construction/walls/strawhenge/all-modules.ts:18`) layer modular frames with infill logic, tagging modules and recursing until spans are filled.
- Non-strawbale walls (`src/construction/walls/index.ts:24`) fall back to solid cuboids while still leveraging segmentation for openings and measurement output.

### Openings, Ring Beams, and Measurements
- Opening framing (`src/construction/openings/openings.ts:1`) expands merged openings, builds header/sill elements, checks fit clearance, emits measurement lines for widths/heights, and drops highlighted areas per opening type.
- Ring beams (`src/construction/ringBeams/ringBeams.ts:1`) offset the interior polygon, calculate miter cuts for each segment, and emit measurement/area tags. Full beams are implemented; double beams currently throw (see issues).
- Measurement utilities (`src/construction/measurements.ts`) project 3D vectors to plan views, group co-linear dimensions, and ensure labels do not overlap by computing offsets from plan bounds.

### Slabs & Storey Context
- Slab methods (`src/construction/slabs`) expose interfaces for construction thickness and offsets. The monolithic implementation extrudes the construction polygon; the joist path is still marked TODO (`src/construction/slabs/joists.ts:6`).
- `createWallStoreyContext` (`src/construction/walls/segmentation.ts:163`) combines slab top/bottom offsets with storey heights to define construction heights for wall segments, informing floor-level cuts and plate placement.

### Materials, Tags, and Results
- Materials are typed (`src/construction/materials/material.ts`) by dimensional capabilities, seeded with straw, strawbale, various lumber sizes, and CLT sheets. `injectMaterialCSS` creates per-material SVG CSS classes.
- Construction results (`src/construction/results.ts`) provide a generator-friendly API for aggregating elements, warnings, errors, measurements, and highlighted areas, making it easy for wall/slab/ring-beam code to annotate output.
- Tags (`src/construction/tags.ts`) categorize components (straw, wall wood, measurements, openings) and are attached throughout construction for filtering in viewers or plan legends.

## Third-Party Dependencies

| Package(s) | Purpose in Project | Notes |
| --- | --- | --- |
| `react`, `react-dom`, `@radix-ui/react-*`, `@radix-ui/themes`, `tailwindcss` | UI rendering, layout primitives, theming | Radix provides consistent design tokens/components; Tailwind mainly supplies utility classes. |
| `zustand`, `zundo`, `immer`, `fast-deep-equal`, `throttle-debounce` | State management, undo/redo, persistence throttling | `zundo` wraps Zustand to capture history, `immer` simplifies mutations, `fast-deep-equal` prevents redundant history entries. |
| `konva`, `react-konva` | 2D canvas stage for the plan editor | Provides performant vector drawing and event handling for tools. |
| `three`, `@react-three/fiber`, `@react-three/drei` | 3D construction viewer | Lazy-loaded into a dedicated chunk; Drei supplies OrbitControls and exporters. |
| `gl-matrix` | Vector/matrix math shared across geometry computations | Used heavily for Vec2/Vec3 operations, projections, and transformations. |
| `clipper2-wasm` | Polygon predicates and validity checks | Replaces Turf for point containment and self-intersection tests, enabling future robust offsets alongside existing custom helpers. |
| `workbox-window`, `vite-plugin-pwa` | Progressive web app support and offline caching | Service worker auto-updates and caches vendor chunks per Vite configuration. |
| `next-themes` | Theme synchronization between Radix and canvas consumers | Drives the canvas palette exposed through `CanvasThemeContext`. |
| Testing stack (`vitest`, `@testing-library/react`, `vitest-canvas-mock`, `fast-check`) | Unit and snapshot testing for components, geometry, and construction logic | Property tests exist for geometry (see `src/construction/geometry.test.ts`). |

## Potential Issues & Improvements

- **High** — Joist slab construction is unimplemented and currently throws (`src/construction/slabs/joists.ts:6`). Selecting a joist slab config (allowed via the configuration UI) will crash construction plan/3D generation. Implement the joist `construct` method or proactively disable joist options until supported.
- **High** — Double ring beams are validated but `constructDoubleRingBeam` throws (`src/construction/ringBeams/ringBeams.ts:194`). Users can configure a double ring beam in the modal, resulting in runtime errors during perimeter construction. Either implement the double-beam geometry or gate the option with UI validation.
- **Medium** — Slab footprints derive from a single minimum outside thickness offset (`src/construction/perimeter.ts:63`). Mixed wall build-ups (different exterior layers) will cause the slab polygon to intrude into thicker walls or detach from thinner ones. Consider computing per-edge offsets or generating the construction polygon from inside wall lines instead of a global minimum.
- **Medium** — The custom polygon offset (`src/shared/geometry/polygon.ts:181`) uses a naive bisector approach that does not guard against concave shapes or tight angles. For irregular perimeters the resulting polygon may self-intersect, impacting ring beams and slab silhouettes. Replacing it with a robust offset library (e.g., Clipper) or post-validating the output would improve reliability.
- **Low** — `subscribeToMaterials` in `src/app/main.tsx` is invoked without retaining the unsubscribe handle. In Strict Mode or during hot updates this can register duplicate listeners that repeatedly inject CSS. Store and dispose the subscription inside an effect to prevent leaks.
- **Low** — Chunk preloading in `src/shared/services/chunkPreloader.ts` assumes `manifest.json` lives at `BASE_URL`. If deployment hosts assets behind a CDN path, the prefetch URLs may misalign. Consider deriving URLs from `import.meta.env.BASE_URL` consistently or exposing configuration.

## Suggested Next Steps
1. Implement or disable unsupported construction paths (joist slabs, double ring beams) to prevent editor actions from crashing downstream viewers.
2. Replace the slab/ring beam offset calculations with per-edge solutions or a geometry library to support irregular footprints reliably.
3. Audit listener lifecycles (material store subscriptions, prefetchers) to ensure cleanup in Strict Mode and improve production stability.
4. Expand automated coverage around perimeter geometry changes—especially wall splitting/merging—to catch regressions as construction methods evolve.
