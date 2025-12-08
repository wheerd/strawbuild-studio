import { mat4 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { createProjectionMatrix } from '@/construction/geometry'
import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

import { getVisibleFacesInViewSpace } from './faces'

describe('getVisibleFacesInViewSpace', () => {
  it('should apply backface culling for a cube in top view (XY)', () => {
    const module = getManifoldModule()

    // Create a simple 100x100x100 cube at origin
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Top view projection (looking down -Z)
    const projection = createProjectionMatrix('xy', 1, 1)

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, projection)

    // In top view of a cube, we should only see the top face (and possibly side faces if perpendicular)
    // With backface culling and excluding perpendicular faces, we should see fewer than all 6 faces
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.length).toBeLessThan(6) // Should not see all faces
  })

  it('should apply backface culling for a cube in front view (XZ)', () => {
    const module = getManifoldModule()

    // Create a simple cube
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Front view projection (looking along -Y)
    const projection = createProjectionMatrix('xz', 1, 1)

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, projection)

    // Should only see front-facing faces
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.length).toBeLessThan(6)
  })

  it('should apply backface culling for a cube in side view (YZ)', () => {
    const module = getManifoldModule()

    // Create a simple cube
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Side view projection (looking along -X)
    const projection = createProjectionMatrix('yz', 1, 1)

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, projection)

    // Should only see front-facing faces
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.length).toBeLessThan(6)
  })

  it('should handle rotated geometry correctly', () => {
    const module = getManifoldModule()

    // Create a cube
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Rotate 45° around Z axis
    const rotateTransform = mat4.create()
    mat4.rotateZ(rotateTransform, rotateTransform, Math.PI / 4)

    // Top view projection
    const projection = createProjectionMatrix('xy', 1, 1)

    // Combine transforms
    const finalTransform = mat4.multiply(mat4.create(), projection, rotateTransform)

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, finalTransform)

    // Should still see only front-facing faces
    expect(faces.length).toBeGreaterThan(0)
  })

  it('should merge coplanar slim triangles from extruded thin rectangles', () => {
    const module = getManifoldModule()

    // Simulate a plaster layer: very thin (2mm) but wide (3000mm) extruded rectangle
    // This creates slim triangles on the top face that should be merged
    const thinRectangle = module.CrossSection.ofPolygons(
      [
        [
          [0, 0],
          [3000, 0],
          [3000, 2],
          [0, 2]
        ]
      ],
      'EvenOdd'
    )

    // Extrude to create a thin wall (typical plaster thickness: 30mm)
    const plasterLayer = thinRectangle.extrude(30)

    // Top view projection (looking down at the thin top face)
    // XY plane projects down from +Z, so we're looking at the top (z=30)
    const projection = createProjectionMatrix('xy', 1, 1)

    const faces = getVisibleFacesInViewSpace(plasterLayer, projection, false)

    expect(faces.length).toBe(6)

    // Find the face with the largest area (should be the top)
    const areas = faces.map(face => {
      const points = face.outer.points
      let area = 0
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length
        area += points[i][0] * points[j][1] - points[j][0] * points[i][1]
      }
      return Math.abs(area) / 2
    })

    const maxArea = Math.max(...areas)
    const largestFaceIndex = areas.findIndex(a => a === maxArea)
    const largestFace = faces[largestFaceIndex]

    // The largest face should be approximately 3000 * 2 = 6000 square units
    expect(maxArea).toBeCloseTo(6000)
    expect(largestFace.outer.points.length).toBeGreaterThanOrEqual(4)
  })
})
