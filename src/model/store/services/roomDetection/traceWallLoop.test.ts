import { RoomDetectionEngine } from './RoomDetectionEngine'
import { createPoint2D } from '@/types/geometry'
import type { RoomDetectionGraph } from './types'
import { createPointId, createWallId } from '@/types/ids'

describe('traceWallLoop DFS implementation', () => {
  let engine: RoomDetectionEngine

  beforeEach(() => {
    engine = new RoomDetectionEngine()
  })

  test('should trace a simple square loop', () => {
    // Create a simple 4-point square
    const p1 = createPointId()
    const p2 = createPointId()
    const p3 = createPointId()
    const p4 = createPointId()
    
    const w1 = createWallId() // p1 -> p2
    const w2 = createWallId() // p2 -> p3
    const w3 = createWallId() // p3 -> p4
    const w4 = createWallId() // p4 -> p1

    const graph: RoomDetectionGraph = {
      points: new Map([
        [p1, createPoint2D(0, 0)],
        [p2, createPoint2D(10, 0)],
        [p3, createPoint2D(10, 10)],
        [p4, createPoint2D(0, 10)]
      ]),
      edges: new Map([
        [p1, [{ endPointId: p2, wallId: w1 }, { endPointId: p4, wallId: w4 }]],
        [p2, [{ endPointId: p3, wallId: w2 }, { endPointId: p1, wallId: w1 }]],
        [p3, [{ endPointId: p4, wallId: w3 }, { endPointId: p2, wallId: w2 }]],
        [p4, [{ endPointId: p1, wallId: w4 }, { endPointId: p3, wallId: w3 }]]
      ])
    }

    const result = engine.traceWallLoop(p1, p2, graph)

    expect(result).not.toBeNull()
    expect(result!.pointIds).toHaveLength(4)
    expect(result!.wallIds).toHaveLength(4)
    
    // Should form a complete cycle
    expect(result!.pointIds[0]).toBe(p1)
    expect(result!.pointIds[1]).toBe(p2)
    expect(result!.wallIds).toContain(w1)
    expect(result!.wallIds).toContain(w2)
    expect(result!.wallIds).toContain(w3)
    expect(result!.wallIds).toContain(w4)
  })

  test('should find minimal cycle when multiple paths exist', () => {
    // Create a more complex graph with multiple possible paths
    const p1 = createPointId()
    const p2 = createPointId()
    const p3 = createPointId()
    const p4 = createPointId()
    const p5 = createPointId() // Center point
    
    const w1 = createWallId() // p1 -> p2
    const w2 = createWallId() // p2 -> p3
    const w3 = createWallId() // p3 -> p4
    const w4 = createWallId() // p4 -> p1
    const w5 = createWallId() // p1 -> p5
    const w6 = createWallId() // p2 -> p5
    const w7 = createWallId() // p3 -> p5

    const graph: RoomDetectionGraph = {
      points: new Map([
        [p1, createPoint2D(0, 0)],
        [p2, createPoint2D(10, 0)],
        [p3, createPoint2D(10, 10)],
        [p4, createPoint2D(0, 10)],
        [p5, createPoint2D(5, 5)] // Center
      ]),
      edges: new Map([
        [p1, [
          { endPointId: p2, wallId: w1 },
          { endPointId: p4, wallId: w4 },
          { endPointId: p5, wallId: w5 }
        ]],
        [p2, [
          { endPointId: p3, wallId: w2 },
          { endPointId: p1, wallId: w1 },
          { endPointId: p5, wallId: w6 }
        ]],
        [p3, [
          { endPointId: p4, wallId: w3 },
          { endPointId: p2, wallId: w2 },
          { endPointId: p5, wallId: w7 }
        ]],
        [p4, [
          { endPointId: p1, wallId: w4 },
          { endPointId: p3, wallId: w3 }
        ]],
        [p5, [
          { endPointId: p1, wallId: w5 },
          { endPointId: p2, wallId: w6 },
          { endPointId: p3, wallId: w7 }
        ]]
      ])
    }

    const result = engine.traceWallLoop(p1, p2, graph)

    expect(result).not.toBeNull()
    // Should find a smaller triangle rather than the full square
    // Due to angle-based selection, it should prefer smaller angles
    expect(result!.pointIds.length).toEqual(3)
    expect(result!.wallIds.length).toEqual(3)
  })

  test('should return null when no cycle exists', () => {
    // Create a linear path with no cycle
    const p1 = createPointId()
    const p2 = createPointId()
    const p3 = createPointId()
    
    const w1 = createWallId()
    const w2 = createWallId()

    const graph: RoomDetectionGraph = {
      points: new Map([
        [p1, createPoint2D(0, 0)],
        [p2, createPoint2D(10, 0)],
        [p3, createPoint2D(20, 0)]
      ]),
      edges: new Map([
        [p1, [{ endPointId: p2, wallId: w1 }]],
        [p2, [{ endPointId: p3, wallId: w2 }, { endPointId: p1, wallId: w1 }]],
        [p3, [{ endPointId: p2, wallId: w2 }]]
      ])
    }

    const result = engine.traceWallLoop(p1, p2, graph)
    expect(result).toBeNull()
  })

  test('should respect wall usage constraint (no reuse)', () => {
    // Test that walls can't be used twice in the same trace
    const p1 = createPointId()
    const p2 = createPointId()
    const p3 = createPointId()
    
    const w1 = createWallId()

    const graph: RoomDetectionGraph = {
      points: new Map([
        [p1, createPoint2D(0, 0)],
        [p2, createPoint2D(10, 0)],
        [p3, createPoint2D(5, 5)]
      ]),
      edges: new Map([
        [p1, [{ endPointId: p2, wallId: w1 }]],
        [p2, [{ endPointId: p1, wallId: w1 }]], // Same wall, different direction
        [p3, []] // Isolated point
      ])
    }

    const result = engine.traceWallLoop(p1, p2, graph)
    // Should not find a cycle because there's only one wall connecting p1 and p2
    expect(result).toBeNull()
  })
})