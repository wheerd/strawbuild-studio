import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { Vec2 } from '@/shared/geometry'
import { midpoint } from '@/shared/geometry'

interface ConstraintBadgeProps {
  label: string
  startPoint: Vec2
  endPoint: Vec2
  outsideDirection: Vec2
  offset: number
  /** Whether the constraint is locked (active). When false, shows as a suggestion without the lock icon. */
  locked?: boolean
  /** Click handler — when provided the badge becomes interactive. */
  onClick?: () => void
  /** Translation key suffix for the tooltip (e.g. 'horizontal', 'vertical', 'perpendicular'). */
  tooltipKey?: 'horizontal' | 'vertical' | 'perpendicular' | 'colinear'
  status?: 'conflicting' | 'redundant' | 'normal'
}

export function ConstraintBadge({
  label,
  startPoint,
  endPoint,
  outsideDirection,
  offset,
  locked,
  onClick,
  tooltipKey,
  status = 'normal'
}: ConstraintBadgeProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const fontSize = 60
  const mid = midpoint(startPoint, endPoint)
  const badgeX = mid[0] + outsideDirection[0] * offset
  const badgeY = mid[1] + outsideDirection[1] * offset

  const isInteractive = onClick != null

  // Show lock icon when locked is true or undefined (backward compat)
  const showLock = locked !== false
  const displayText = showLock ? `\uD83D\uDD12${label}` : label

  // Compute rounded-rect dimensions (roughly 2:1 width:height ratio to accommodate lock + label)
  const rectHeight = fontSize * 1.6
  const rectWidth = showLock ? rectHeight * 2 : rectHeight * 1.4
  const cornerRadius = rectHeight * 0.3

  const rectClasses = useMemo(() => {
    if (status === 'conflicting') {
      return 'fill-red-600 hover:fill-red-600/80'
    }
    if (status === 'redundant') {
      return 'fill-orange-600 hover:fill-orange-500'
    }
    return showLock && isInteractive
      ? 'fill-primary group-hover:fill-primary/90'
      : 'fill-muted group-hover:fill-accent stroke-border'
  }, [status, showLock, isInteractive])

  const textClasses = useMemo(() => {
    if (status === 'conflicting') {
      return 'fill-destructive-foreground'
    }
    if (status === 'redundant') {
      return 'fill-foreground'
    }
    return showLock && isInteractive
      ? 'fill-primary-foreground'
      : 'fill-muted-foreground group-hover:fill-accent-foreground'
  }, [status, showLock, isInteractive])

  const baseTooltip = tooltipKey
    ? showLock
      ? t($ => $.constraint[tooltipKey].active)
      : t($ => $.constraint[tooltipKey].suggestion)
    : undefined

  const statusTooltip = useMemo(() => {
    if (status === 'conflicting') return 'Constraint conflicts with other constraints'
    if (status === 'redundant') return 'Redundant constraint (not needed)'
    return undefined
  }, [status])

  const tooltip = [baseTooltip, statusTooltip].filter(Boolean).join('. ')

  return (
    <g
      className={isInteractive ? 'group cursor-pointer select-none' : 'pointer-events-none select-none'}
      onClick={isInteractive ? onClick : undefined}
    >
      {tooltip && <title>{tooltip}</title>}
      <rect
        x={badgeX - rectWidth / 2}
        y={badgeY - rectHeight / 2}
        width={rectWidth}
        height={rectHeight}
        rx={cornerRadius}
        ry={cornerRadius}
        className={rectClasses}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        className={textClasses}
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="sans-serif"
        transform={`translate(${badgeX} ${badgeY}) scale(1, -1)`}
      >
        {displayText}
      </text>
    </g>
  )
}
