# StrawBuild Studio Codebase Review (from October 2025)

## Overview

- React 19 single-page app that loads the editor shell via suspense (`src/app/App.tsx`) and bootstraps theming, material styling, and service worker support in `src/app/main.tsx`.
- Core state lives in Zustand stores with undo/redo, local persistence, and configuration repositories for materials, floors, ring beams, and wall assemblies.
- Editors present a 2D plan canvas (SVG) backed by a modular tool system and provide SVG construction plans plus a Three.js 3D viewer generated from construction models.
- Business logic focuses on generating wall segments, openings, ring beams, and floors for strawbale-centric construction strategies before merging them into renderable construction models.

## Architecture

### Application Shell

- `src/app/App.tsx` lazy-loads the editor while prefetching chunks via `startChunkPreloading` and shows a skeleton during suspense.
- `src/app/main.tsx` wires Radix + next-themes providers, injects dynamic material CSS, subscribes to material updates, and registers the Workbox-powered service worker for offline readiness.
- Vite configuration (`vite.config.ts`) adds custom HTML transforms for non-blocking CSS, PWA caching via `vite-plugin-pwa`, and manual chunking to isolate large vendors (Three).

### State & Persistence

- The building model store (`src/building/store/index.ts`) combines slices for storeys and perimeters, wraps them with `immer` for ergonomic mutations, persists state to `localStorage`, and layers undo/redo through `zundo`.
- Perimeter geometry and wall data are maintained in `src/building/store/slices/perimeterSlice.ts`, which recalculates wall directions, offsets, openings, and corner metadata whenever topology changes.
- Storey management lives in `src/building/store/slices/storeysSlice.ts`, enforcing positive heights, preserving a default ground floor, and exposing helpers such as `adjustAllLevels`.
- Configuration data (materials, wall methods, floors, ring beams) is centralized in `src/construction/config/store.ts`, persisted with Zustand middleware, and exposed through hooks/context (`ConfigurationModalContext`).
- Materials have their own store (`src/construction/materials/store.ts`) seeded with defaults, validated for dimensional sanity, and used both for rendering and CSS generation (`materialCSS.ts`).

### Editor Experience

- `src/editor/FloorPlanEditor.tsx` orchestrates the layout: toolbar, configuration modal, welcome modal, editor SVG viewport, side inspector, and status bar. It manages viewport sizing, keyboard shortcuts, and focus handling.
- Canvas rendering is handled by `FloorPlanStage` (`src/editor/canvas/layers/FloorPlanStage.tsx`), which translates events into tool actions, supports wheel/pinch zoom, panning, and keeps pointer state in sync.
- The tool system (`src/editor/tools/system/store.ts`) maintains a stack of active tools, offers programmatic push/pop/replace APIs, and routes pointer events to tool implementations described in `metadata.ts`.
- Side panels and tool inspectors render tool-specific UI by reading the active tool’s inspector component (`src/editor/SidePanel.tsx`).

### Construction Rendering

- `constructModel` (`src/construction/storeys/storey.ts`) walks ordered storeys, builds each perimeter via `constructPerimeter`, applies vertical offsets determined by floor configs, and merges results into a single `ConstructionModel`.
- `constructPerimeter` (`src/construction/perimeters/perimeter.ts`) retrieves the relevant storey, resolves assemblies, builds ring beams, constructs each wall via strategy-specific handlers, and then creates the floor footprint.
- 2D plan rendering lives in `src/construction/components/ConstructionPlan.tsx`, projecting `ConstructionModel` elements into SVG, layering highlighted areas, errors, warnings, and auto-generated measurements.
- The 3D viewer (`src/construction/viewer3d/ConstructionViewer3D.tsx`) renders the same construction model using `@react-three/fiber`, with orbit controls, grid helper, opacity controls, and export tooling.

### Shared Utilities & Services

- Geometry utilities in `src/shared/geometry` provide branded lengths, vector math (powered by gl-matrix), polygon validations (clipper2-wasm), offsets, and helpers for computing measurement baselines.
- Chunk preloading (`src/shared/services/chunkPreloader.ts`) opportunistically prefetches non-entry bundles post-load using `requestIdleCallback`.
- Import/export support (`src/shared/services/ProjectImportExportService.ts`) serializes building and configuration stores, manages version compatibility, and reconstructs perimeters with regenerated IDs.
- Tailwind is used mainly for base styles while Radix Themes and CSS variables drive theming; `CanvasThemeContext` reads those variables for canvas/SVG consumers.

## Construction Business Logic

### Perimeter Geometry & Model Foundation

- Perimeter creation and mutation (`src/building/store/slices/perimeterSlice.ts`) generate walls and corners from polygon boundaries, prevent self-intersections, and recalculate wall vectors, offsets, and angles through `updatePerimeterGeometry`.
- Corner removal, wall splitting/merging, and opening validation are all handled in the same slice, guaranteeing consistent geometry before construction routines consume the data.

### Wall Segmentation & Construction Strategies

- `segmentedWallConstruction` (`src/construction/walls/segmentation.ts`) calculates corner extensions, floor/ceiling offsets, plate areas, and partitions each wall into wall segments and opening segments. It emits highlighted areas (corners, plates, floor levels) and measurement tags.
- Infill walls (`src/construction/walls/infill/infill.ts`) recursively place straw bales and posts while respecting max spacing/min straw space, generate measurement tags, and flag insufficient room via warnings/errors.
- Strawhenge/module strategies (`src/construction/walls/strawhenge/strawhenge.ts`, `src/construction/walls/strawhenge/all-modules.ts`) layer modular frames with infill logic, tagging modules and recursing until spans are filled.
- Non-strawbale walls (`src/construction/walls/index.ts`) fall back to solid cuboids while still leveraging segmentation for openings and measurement output.

### Openings, Ring Beams, and Measurements

- Opening framing (`src/construction/openings/openings.ts`) expands merged openings, builds header/sill elements, checks fit clearance, emits measurement lines for widths/heights, and drops highlighted areas per opening type.
- Ring beams (`src/construction/ringBeams/ringBeams.ts`) offset the interior polygon, calculate miter cuts for each segment, and emit measurement/area tags. Full beams are implemented; double beams currently throw (see issues).
- Measurement utilities (`src/construction/measurements.ts`) project 3D vectors to plan views, group co-linear dimensions, and ensure labels do not overlap by computing offsets from plan bounds.

### Slabs & Storey Context

- Slab methods (`src/construction/floors`) expose interfaces for construction thickness and offsets. The monolithic implementation extrudes the construction polygon; the joist path is still marked TODO (`src/construction/floors/joists.ts`).
- `createWallStoreyContext` (`src/construction/storeys/context.ts`) combines floor top/bottom offsets with storey heights to define construction heights for wall segments, informing floor-level cuts and plate placement.

### Materials, Tags, and Results

- Materials are typed (`src/construction/materials/material.ts`) by dimensional capabilities, seeded with straw, strawbale, various lumber sizes, and CLT sheets. `injectMaterialCSS` creates per-material SVG CSS classes.
- Construction results (`src/construction/results.ts`) provide a generator-friendly API for aggregating elements, warnings, errors, measurements, and highlighted areas, making it easy for wall/floor/ring-beam code to annotate output.
- Tags (`src/construction/tags.ts`) categorize components (straw, wall wood, measurements, openings) and are attached throughout construction for filtering in viewers or plan legends.

## Third-Party Dependencies

| Package(s)                                                                             | Purpose in Project                                                         | Notes                                                                                                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --- |
| `react`, `react-dom`, `@radix-ui/react-*`, `@radix-ui/themes`, `tailwindcss`           | UI rendering, layout primitives, theming                                   | Radix provides consistent design tokens/components; Tailwind mainly supplies utility classes.                                 |
| `zustand`, `zundo`, `immer`, `fast-deep-equal`                                         | State management, undo/redo, persistence throttling                        | `zundo` wraps Zustand to capture history, `immer` simplifies mutations, `fast-deep-equal` prevents redundant history entries. |     |
| `three`, `@react-three/fiber`, `@react-three/drei`                                     | 3D construction viewer                                                     | Lazy-loaded into a dedicated chunk; Drei supplies OrbitControls and exporters.                                                |
| `gl-matrix`                                                                            | Vector/matrix math shared across geometry computations                     | Used heavily for vec2/vec3 operations, projections, and transformations.                                                      |
| `clipper2-wasm`                                                                        | Polygon predicates, area/orientation, validity checks                      | For containment, winding order, area, and simplification helpers.                                                             |
| `workbox-window`, `vite-plugin-pwa`                                                    | Progressive web app support and offline caching                            | Service worker auto-updates and caches vendor chunks per Vite configuration.                                                  |
| `next-themes`                                                                          | Theme synchronization between Radix and canvas consumers                   | Drives the canvas palette exposed through `CanvasThemeContext`.                                                               |
| Testing stack (`vitest`, `@testing-library/react`, `vitest-canvas-mock`, `fast-check`) | Unit and snapshot testing for components, geometry, and construction logic | Property tests exist for geometry (see `src/construction/geometry.test.ts`).                                                  |
