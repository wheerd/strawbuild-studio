import type { Manifold } from 'manifold-3d'
import { type Handle, IFC4, type IfcLineObject } from 'web-ifc'

import { getFacesFromManifoldIndexed } from '@/construction/manifold/faces'

/**
 * Converts Manifold geometry to IFC geometric representations
 * Uses IfcFacetedBrep with IfcPolyLoop for maximum viewer compatibility
 */
export class ManifoldToIfcConverter {
  private exporter: {
    writeEntity: <T extends IfcLineObject>(entity: T) => Handle<T>
    createCartesianPoint: (coords: [number, number, number]) => Handle<IFC4.IfcCartesianPoint>
  }

  // Cached cartesian points for vertices
  private cartesianPoints: Handle<IFC4.IfcCartesianPoint>[] = []

  constructor(exporter: {
    writeEntity: <T extends IfcLineObject>(entity: T) => Handle<T>
    createCartesianPoint: (coords: [number, number, number]) => Handle<IFC4.IfcCartesianPoint>
  }) {
    this.exporter = exporter
  }

  /**
   * Main conversion entry point
   * Uses IfcFacetedBrep with IfcPolyLoop for maximum viewer compatibility
   * Returns null if manifold has no valid faces (e.g., after filtering artifacts)
   */
  convert(manifold: Manifold): Handle<IFC4.IfcFacetedBrep> | null {
    this.cartesianPoints = []
    return this.toFacetedBrep(manifold)
  }

  /**
   * Convert manifold to IfcFacetedBrep using IfcPolyLoop
   * Returns null if there are no valid faces after filtering
   */
  private toFacetedBrep(manifold: Manifold): Handle<IFC4.IfcFacetedBrep> | null {
    // Get indexed faces with deduplicated vertices
    const { vertices, faces } = getFacesFromManifoldIndexed(manifold)

    // Return null if no valid faces (e.g., all filtered out as artifacts)
    if (faces.length === 0) {
      return null
    }

    // Create IfcCartesianPoint for each unique vertex
    this.cartesianPoints = vertices.map(v => this.exporter.createCartesianPoint([v[0], v[1], v[2]]))

    // Create faces with poly loops
    const ifcFaces: Handle<IFC4.IfcFace>[] = []

    for (const face of faces) {
      const outerBound = this.createFaceBound(face.outer, true)

      // Skip face if outer bound is invalid
      if (!outerBound) {
        continue
      }

      // Filter out invalid hole bounds
      const innerBounds = face.holes
        .map(hole => this.createFaceBound(hole, false))
        .filter((bound): bound is Handle<IFC4.IfcFaceBound> => bound !== null)

      const ifcFace = this.exporter.writeEntity(new IFC4.IfcFace([outerBound, ...innerBounds]))
      ifcFaces.push(ifcFace)
    }

    // Return null if no valid faces remain
    if (ifcFaces.length === 0) {
      return null
    }

    // Assemble closed shell and B-Rep
    const closedShell = this.exporter.writeEntity(new IFC4.IfcClosedShell(ifcFaces))
    return this.exporter.writeEntity(new IFC4.IfcFacetedBrep(closedShell))
  }

  /**
   * Create a face bound using IfcPolyLoop
   * Returns null if loop is invalid (< 3 vertices)
   */
  private createFaceBound(loop: number[], isOuter: boolean): Handle<IFC4.IfcFaceBound> | null {
    // Validate loop has at least 3 vertices
    if (loop.length < 3) {
      return null
    }

    // Map vertex indices to IfcCartesianPoint handles
    const points = loop.map(vertexIdx => this.cartesianPoints[vertexIdx])

    // Create IfcPolyLoop
    const polyLoop = this.exporter.writeEntity(new IFC4.IfcPolyLoop(points))

    if (isOuter) {
      return this.exporter.writeEntity(new IFC4.IfcFaceOuterBound(polyLoop, new IFC4.IfcBoolean(true)))
    } else {
      return this.exporter.writeEntity(new IFC4.IfcFaceBound(polyLoop, new IFC4.IfcBoolean(false)))
    }
  }
}
