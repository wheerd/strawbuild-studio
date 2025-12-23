import type { Manifold } from 'manifold-3d'
import { type Handle, IFC4, type IfcLineObject } from 'web-ifc'

import { type Face3D, getFacesFromManifold } from '@/construction/manifold/faces'
import type { Polygon3D } from '@/shared/geometry'

/**
 * Converts Manifold geometry to IFC geometric representations
 * Supports two strategies:
 * 1. IfcFacetedBrep (preferred) - Preserves planar face information
 * 2. IfcTriangulatedFaceSet (fallback) - Raw triangle mesh
 */
export class ManifoldToIfcConverter {
  private exporter: {
    writeEntity: <T extends IfcLineObject>(entity: T) => Handle<T>
    createCartesianPoint: (coords: [number, number, number]) => Handle<IFC4.IfcCartesianPoint>
  }

  constructor(exporter: {
    writeEntity: <T extends IfcLineObject>(entity: T) => Handle<T>
    createCartesianPoint: (coords: [number, number, number]) => Handle<IFC4.IfcCartesianPoint>
  }) {
    this.exporter = exporter
  }

  /**
   * Main conversion entry point with automatic fallback
   */
  convert(manifold: Manifold): Handle<IFC4.IfcFacetedBrep> | Handle<IFC4.IfcTriangulatedFaceSet> {
    try {
      return this.toFacetedBrep(manifold)
    } catch (error) {
      console.warn('B-Rep conversion failed, using triangulated mesh:', error)
      return this.toTriangulatedFaceSet(manifold)
    }
  }

  /**
   * Primary strategy: Convert manifold to IfcFacetedBrep
   * Preserves planar face information from manifold
   */
  private toFacetedBrep(manifold: Manifold): Handle<IFC4.IfcFacetedBrep> {
    const faces3D = getFacesFromManifold(manifold)

    if (faces3D.length === 0) {
      throw new Error('No faces extracted from manifold')
    }

    const ifcFaces = faces3D.map(face3d => this.createIfcFace(face3d))
    const closedShell = this.exporter.writeEntity(new IFC4.IfcClosedShell(ifcFaces))

    return this.exporter.writeEntity(new IFC4.IfcFacetedBrep(closedShell))
  }

  /**
   * Fallback strategy: Convert manifold to IfcTriangulatedFaceSet
   * For cases where B-Rep conversion fails
   */
  private toTriangulatedFaceSet(manifold: Manifold): Handle<IFC4.IfcTriangulatedFaceSet> {
    const mesh = manifold.getMesh()

    // Extract coordinates (convert to IFC types)
    const coords: IFC4.IfcLengthMeasure[][] = []
    for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
      coords.push([
        new IFC4.IfcLengthMeasure(mesh.vertProperties[i]),
        new IFC4.IfcLengthMeasure(mesh.vertProperties[i + 1]),
        new IFC4.IfcLengthMeasure(mesh.vertProperties[i + 2])
      ])
    }
    const coordList = this.exporter.writeEntity(new IFC4.IfcCartesianPointList3D(coords))

    // Extract triangle indices (1-based for IFC, convert to IFC types)
    const coordIndex: IFC4.IfcPositiveInteger[][] = []
    for (let i = 0; i < mesh.triVerts.length; i += 3) {
      coordIndex.push([
        new IFC4.IfcPositiveInteger(mesh.triVerts[i] + 1),
        new IFC4.IfcPositiveInteger(mesh.triVerts[i + 1] + 1),
        new IFC4.IfcPositiveInteger(mesh.triVerts[i + 2] + 1)
      ])
    }

    return this.exporter.writeEntity(new IFC4.IfcTriangulatedFaceSet(coordList, null, null, coordIndex, null))
  }

  private createIfcFace(face3d: Face3D): Handle<IFC4.IfcFace> {
    const outerBound = this.createFaceBound(face3d.polygon.outer, true)
    const innerBounds = face3d.polygon.holes.map(hole => this.createFaceBound(hole, false))

    return this.exporter.writeEntity(new IFC4.IfcFace([outerBound, ...innerBounds]))
  }

  private createFaceBound(polygon: Polygon3D, isOuter: boolean): Handle<IFC4.IfcFaceBound> {
    const points = polygon.points.map(p => this.exporter.createCartesianPoint([p[0], p[1], p[2]]))
    const polyLoop = this.exporter.writeEntity(new IFC4.IfcPolyLoop(points))

    return this.exporter.writeEntity(new IFC4.IfcFaceBound(polyLoop, new IFC4.IfcBoolean(isOuter)))
  }
}
