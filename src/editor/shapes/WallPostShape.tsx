import type { WallPostId } from '@/building/model/ids'
import { useWallPostById } from '@/building/store'
import { EntityMeasurementsShape } from '@/editor/shapes/EntityMeasurementsShape'
import { type Vec2, lerpVec2 } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

export function WallPostShape({ postId }: { postId: WallPostId }): React.JSX.Element {
  const post = useWallPostById(postId)

  const postPolygonPoints = post.polygon.points.map((p: Vec2) => `${p[0]},${p[1]}`).join(' ')
  const insidePostStart = post.insideLine.start
  const insidePostEnd = post.insideLine.end
  const outsidePostStart = post.outsideLine.start
  const outsidePostEnd = post.outsideLine.end

  return (
    <g
      name={`wall-post-${post.id}`}
      data-entity-id={post.id}
      data-entity-type="wall-post"
      data-parent-ids={JSON.stringify([post.perimeterId, post.wallId])}
    >
      <polygon
        points={postPolygonPoints}
        fill="var(--color-muted)"
        fillOpacity={0.8}
        stroke="var(--color-border-contrast)"
        strokeWidth={10}
        strokeLinejoin="miter"
      />

      {(post.postType === 'inside' || post.postType === 'double') && (
        <polygon
          points={[
            insidePostStart,
            insidePostEnd,
            lerpVec2(insidePostEnd, outsidePostEnd, 1 / 3),
            lerpVec2(insidePostStart, outsidePostStart, 1 / 3)
          ]
            .map(p => `${p[0]},${p[1]}`)
            .join(' ')}
          fill={MATERIAL_COLORS.woodSupport}
          stroke="var(--color-border-contrast)"
          strokeWidth={5}
          strokeLinejoin="miter"
        />
      )}

      {post.postType === 'center' && (
        <polygon
          points={[
            lerpVec2(insidePostStart, outsidePostStart, 1 / 3),
            lerpVec2(insidePostEnd, outsidePostEnd, 1 / 3),
            lerpVec2(insidePostEnd, outsidePostEnd, 2 / 3),
            lerpVec2(insidePostStart, outsidePostStart, 2 / 3)
          ]
            .map(p => `${p[0]},${p[1]}`)
            .join(' ')}
          fill={MATERIAL_COLORS.woodSupport}
          stroke="var(--color-border-contrast)"
          strokeWidth={5}
          strokeLinejoin="miter"
        />
      )}

      {(post.postType === 'outside' || post.postType === 'double') && (
        <polygon
          points={[
            outsidePostStart,
            outsidePostEnd,
            lerpVec2(insidePostEnd, outsidePostEnd, 2 / 3),
            lerpVec2(insidePostStart, outsidePostStart, 2 / 3)
          ]
            .map(p => `${p[0]},${p[1]}`)
            .join(' ')}
          fill={MATERIAL_COLORS.woodSupport}
          stroke="var(--color-border-contrast)"
          strokeWidth={5}
          strokeLinejoin="miter"
        />
      )}

      <EntityMeasurementsShape entity={post} />
    </g>
  )
}
