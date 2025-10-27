# IFC Export

The application can now export the current model to an Industry Foundation Classes (IFC) file that can be opened in third-party BIM viewers.

## How it works

- The exporter mirrors the construction pipeline (`constructStorey`, `constructPerimeter`) to gather storeys, perimeters, walls, floor areas, and openings from the Zustand model.
- Geometry is emitted in millimetres and the IFC file declares units with a `MILLI` prefix so existing dimensions remain unchanged.
- Walls (`IfcWallStandardCase`) are generated from the inner perimeter segments, extruded by the computed storey height, and annotated with basic metadata (assembly id, thickness).
- Openings (`IfcOpeningElement`) are created for each door/window/passage with width, height, and sill properties and attached to their host walls via `IfcRelVoidsElement`.
- Floor polygons (including holes) are converted into `IfcSlab` elements using arbitrary profiles with voids, based on the finished plan footprint (perimeters + floor areas − openings).
- Storey elevation matches the offsets used in the 3D viewer, so the exported geometry lines up with the current scene.

## Usage

1. Open the 3D construction viewer.
2. Click the export button and choose **IFC**.
3. The browser will download a `strawbaler-YYYY-MM-DD.ifc` file (ISO-10303 STEP format).
4. Import this file into your preferred IFC viewer for inspection or coordination workflows.

## Notes & limitations

- Only the main building structure (storeys, walls, slabs, openings) is exported in this iteration. Additional assemblies (beams, columns, materials) can be layered on later.
- The exporter currently writes STEP text directly without involving `web-ifc`'s `SaveModel`, which keeps the browser workflow synchronous and avoids bundling the WASM writer.
- The file uses a generic `Strawbaler` author/organisation entry in the IFC header. Update `src/exporters/ifc/exporter.ts` if project-specific metadata is required.
- For large models the export may take a few hundred milliseconds; the browser stays responsive during the operation.
