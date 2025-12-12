import { mat4 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { GroupOrElement } from '@/construction/elements'
import { mat4ToManifoldMat4 } from '@/construction/manifoldUtils'
import type { ConstructionIssueId } from '@/construction/results'

/**
 * Accumulates world-space manifolds for each issue by traversing the element tree.
 * This is view-independent - manifolds are in world coordinates.
 *
 * Similar to geometryFaces in faceHelpers.ts, this function:
 * - Traverses the element/group hierarchy
 * - Accumulates transforms down the tree
 * - For each element with issueIds, transforms its manifold to world space
 * - Unions manifolds for each issue
 *
 * @param elements - Root elements to traverse
 * @returns Map of issueId to accumulated world-space manifold
 */
export function accumulateIssueWorldManifolds(elements: GroupOrElement[]): Map<ConstructionIssueId, Manifold> {
  const issueManifolds = new Map<ConstructionIssueId, Manifold>()

  function traverse(element: GroupOrElement, parentTransform: mat4 = mat4.create()) {
    // Accumulate transforms: parent * element
    const worldTransform = mat4.multiply(mat4.create(), parentTransform, element.transform)

    if ('shape' in element) {
      // Leaf element - accumulate its manifold for each issue
      if (element.issueIds && element.issueIds.length > 0) {
        // Transform manifold to world space
        const worldManifold = element.shape.manifold.transform(mat4ToManifoldMat4(worldTransform))

        // Add to each issue's manifold
        for (const issueId of element.issueIds) {
          const existing = issueManifolds.get(issueId)
          issueManifolds.set(issueId, existing ? existing.add(worldManifold) : worldManifold)
        }
      }
    } else if ('children' in element) {
      // Group - handle group-level issues
      if (element.issueIds && element.issueIds.length > 0) {
        // Collect all child manifolds for this group
        const childManifolds: Manifold[] = []
        collectChildManifolds(element, worldTransform, childManifolds)

        if (childManifolds.length > 0) {
          // Union all child manifolds
          const groupManifold = childManifolds.reduce((acc, m) => acc.add(m))

          // Add to each issue on this group
          for (const issueId of element.issueIds) {
            const existing = issueManifolds.get(issueId)
            issueManifolds.set(issueId, existing ? existing.add(groupManifold) : groupManifold)
          }
        }
      }

      // Recurse into children (they may have their own issues)
      for (const child of element.children) {
        traverse(child, worldTransform)
      }
    }
  }

  // Start traversal from root elements
  for (const element of elements) {
    traverse(element)
  }

  return issueManifolds
}

/**
 * Recursively collects all child element manifolds in world space.
 * Used when a group has an issue - we need to union all its children's geometry.
 */
function collectChildManifolds(element: GroupOrElement, parentTransform: mat4, result: Manifold[]) {
  const worldTransform = mat4.multiply(mat4.create(), parentTransform, element.transform)

  if ('shape' in element) {
    // Leaf - add its world-space manifold
    result.push(element.shape.manifold.transform(mat4ToManifoldMat4(worldTransform)))
  } else if ('children' in element) {
    // Group - recurse into children
    for (const child of element.children) {
      collectChildManifolds(child, worldTransform, result)
    }
  }
}
