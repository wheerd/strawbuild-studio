import type { Manifold } from 'manifold-3d'
import { type Handle, IFC4, type IfcLineObject } from 'web-ifc'

import { getFacesFromManifoldIndexed } from '@/construction/manifold/faces'

/**
 * Converts Manifold geometry to IFC geometric representations
 * Uses IfcFacetedBrep with proper topology (shared vertices and edges)
 */
export class ManifoldToIfcConverter {
  private exporter: {
    writeEntity: <T extends IfcLineObject>(entity: T) => Handle<T>
    createCartesianPoint: (coords: [number, number, number]) => Handle<IFC4.IfcCartesianPoint>
  }

  // Topology tracking for proper B-Rep construction
  private edgeCache = new Map<
    string,
    {
      edge: Handle<IFC4.IfcEdgeCurve>
      v1: number // vertex index
      v2: number // vertex index
    }
  >()
  private vertexPoints: Handle<IFC4.IfcVertexPoint>[] = []
  private cartesianPoints: Handle<IFC4.IfcCartesianPoint>[] = []

  constructor(exporter: {
    writeEntity: <T extends IfcLineObject>(entity: T) => Handle<T>
    createCartesianPoint: (coords: [number, number, number]) => Handle<IFC4.IfcCartesianPoint>
  }) {
    this.exporter = exporter
  }

  /**
   * Main conversion entry point
   * Uses IfcFacetedBrep with proper topology to satisfy IFC validation rules
   * Returns null if manifold has no valid faces (e.g., after filtering artifacts)
   */
  convert(manifold: Manifold): Handle<IFC4.IfcFacetedBrep> | null {
    this.resetCache()
    return this.toFacetedBrepWithTopology(manifold)
  }

  /**
   * Reset caches between conversions
   */
  private resetCache(): void {
    this.edgeCache.clear()
    this.vertexPoints = []
  }

  /**
   * Convert manifold to IfcFacetedBrep with proper edge and vertex topology
   * Returns null if there are no valid faces after filtering
   */
  private toFacetedBrepWithTopology(manifold: Manifold): Handle<IFC4.IfcFacetedBrep> | null {
    // Get indexed faces with deduplicated vertices
    const { vertices, faces } = getFacesFromManifoldIndexed(manifold)

    // Return null if no valid faces (e.g., all filtered out as artifacts)
    if (faces.length === 0) {
      return null
    }

    // Create IfcCartesianPoint and IfcVertexPoint for each unique vertex
    this.cartesianPoints = vertices.map(v => this.exporter.createCartesianPoint([v[0], v[1], v[2]]))
    this.vertexPoints = this.cartesianPoints.map(point => this.exporter.writeEntity(new IFC4.IfcVertexPoint(point)))

    // Create faces with edge loops
    const ifcFaces: Handle<IFC4.IfcFace>[] = []

    for (const face of faces) {
      const outerBound = this.createEdgeLoopBound(face.outer, true)

      // Skip face if outer bound is invalid
      if (!outerBound) {
        continue
      }

      // Filter out invalid hole bounds
      const innerBounds = face.holes
        .map(hole => this.createEdgeLoopBound(hole, false))
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
   * Create a face bound using IfcEdgeLoop with shared edges
   * Returns null if loop is invalid (< 3 vertices)
   */
  private createEdgeLoopBound(loop: number[], isOuter: boolean): Handle<IFC4.IfcFaceBound> | null {
    // Validate loop has at least 3 vertices
    if (loop.length < 3) {
      return null
    }

    const orientedEdges: Handle<IFC4.IfcOrientedEdge>[] = []

    for (let i = 0; i < loop.length; i++) {
      const v1 = loop[i]
      const v2 = loop[(i + 1) % loop.length]

      // Skip degenerate edges (same vertex)
      if (v1 === v2) {
        continue
      }

      // Get or create edge (ensuring shared edges between faces)
      const { orientedEdge } = this.getOrCreateEdge(v1, v2)
      orientedEdges.push(orientedEdge)
    }

    // Validate we have at least 3 edges
    if (orientedEdges.length < 3) {
      return null
    }

    const edgeLoop = this.exporter.writeEntity(new IFC4.IfcEdgeLoop(orientedEdges))

    if (isOuter) {
      return this.exporter.writeEntity(new IFC4.IfcFaceOuterBound(edgeLoop, new IFC4.IfcBoolean(true)))
    } else {
      return this.exporter.writeEntity(new IFC4.IfcFaceBound(edgeLoop, new IFC4.IfcBoolean(false)))
    }
  }

  /**
   * Get or create an edge, ensuring edges are shared between adjacent faces
   */
  private getOrCreateEdge(v1: number, v2: number): { orientedEdge: Handle<IFC4.IfcOrientedEdge> } {
    // Normalize edge key (always smaller index first)
    const [minV, maxV] = v1 < v2 ? [v1, v2] : [v2, v1]
    const key = `${minV}_${maxV}`
    const isReversed = v1 > v2

    // Check cache
    let cached = this.edgeCache.get(key)

    if (!cached) {
      // Create new edge curve (line segment between two vertices)
      const edgeCurve = this.exporter.writeEntity(
        new IFC4.IfcPolyline([this.cartesianPoints[minV], this.cartesianPoints[maxV]])
      )

      // Create edge curve (edge with geometry)
      const edge = this.exporter.writeEntity(
        new IFC4.IfcEdgeCurve(
          this.vertexPoints[minV],
          this.vertexPoints[maxV],
          edgeCurve,
          new IFC4.IfcBoolean(true) // SameSense
        )
      )

      cached = { edge, v1: minV, v2: maxV }
      this.edgeCache.set(key, cached)
    }

    // Create oriented edge with correct orientation
    // If we reversed the vertices to normalize, flip the orientation
    const orientedEdge = this.exporter.writeEntity(
      new IFC4.IfcOrientedEdge(cached.edge, new IFC4.IfcBoolean(!isReversed))
    )

    return { orientedEdge }
  }
}
