import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DIMENSION_DEFAULT_FONT_SIZE, WALL_DIM_LAYER_OFFSET, type WallDimLayer } from '@/editor/constants/dimensions'
import { useUiScale } from '@/editor/hooks/useViewportStore'
import type { Vec2 } from '@/shared/geometry'
import { midpoint } from '@/shared/geometry'

interface ConstraintBadgeProps {
  label: string
  startPoint: Vec2
  endPoint: Vec2
  outsideDirection: Vec2
  dimLayer: WallDimLayer
  locked?: boolean
  onClick?: () => void
  tooltipKey?: 'horizontal' | 'vertical' | 'perpendicular' | 'colinear' | 'angle'
  status?: 'conflicting' | 'redundant' | 'normal'
}

export function ConstraintBadge({
  label,
  startPoint,
  endPoint,
  outsideDirection,
  dimLayer,
  locked,
  onClick,
  tooltipKey,
  status = 'normal'
}: ConstraintBadgeProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const uiScale = useUiScale()
  const fontSize = DIMENSION_DEFAULT_FONT_SIZE

  const scaledFontSize = fontSize * uiScale
  const scaledOffset = dimLayer * WALL_DIM_LAYER_OFFSET * uiScale

  const mid = midpoint(startPoint, endPoint)
  const badgeX = mid[0] + outsideDirection[0] * scaledOffset
  const badgeY = mid[1] + outsideDirection[1] * scaledOffset

  const isInteractive = onClick != null

  const showLock = locked !== false

  const iconSize = scaledFontSize * 0.8
  const rectHeight = scaledFontSize * 1.6
  const cornerRadius = rectHeight * 0.3
  const rectWidth = 3 * cornerRadius + iconSize + scaledFontSize * label.length * 0.6

  const lockX = badgeX - rectWidth / 2 + iconSize * 0.5
  const lockY = badgeY + iconSize / 2

  const showAlert = status !== 'normal'
  const alertSize = scaledFontSize
  const alertX = badgeX - alertSize / 2
  const alertY = badgeY + (outsideDirection[1] < 0 ? alertSize : -alertSize)

  const iconHref = showLock ? '#icon-lock' : '#icon-lock-open'
  const borderSize = (scaledFontSize / 8).toFixed(0)

  const rectClasses = useMemo(() => {
    if (status === 'conflicting') {
      return 'fill-red-600 hover:fill-red-600/90'
    }
    if (status === 'redundant') {
      return 'fill-amber-500 hover:fill-amber-500/90'
    }
    return showLock && isInteractive
      ? 'fill-primary group-hover:fill-primary/90'
      : `fill-muted group-hover:fill-accent stroke-border`
  }, [status, showLock, isInteractive])

  const textClasses = useMemo(() => {
    if (status === 'conflicting') {
      return 'font-mono fill-destructive-foreground'
    }
    if (status === 'redundant') {
      return 'font-mono fill-foreground'
    }
    return showLock && isInteractive
      ? 'font-mono fill-primary-foreground'
      : 'font-mono fill-muted-foreground group-hover:fill-accent-foreground'
  }, [status, showLock, isInteractive])

  const lockIconClass = useMemo(() => {
    if (status === 'conflicting') {
      return 'text-destructive-foreground'
    }
    if (status === 'redundant') {
      return 'text-foreground'
    }
    return showLock && isInteractive
      ? 'text-primary-foreground'
      : 'text-muted-foreground group-hover:text-accent-foreground'
  }, [status, showLock, isInteractive])

  const alertIconClass = useMemo(() => {
    if (status === 'conflicting') {
      return 'text-red-600'
    }
    if (status === 'redundant') {
      return 'text-amber-500'
    }
    return 'text-foreground'
  }, [status])

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
        strokeWidth={borderSize}
      />
      <use
        href={iconHref}
        x={0}
        y={0}
        width={iconSize}
        height={iconSize}
        className={lockIconClass}
        transform={`translate(${lockX} ${lockY}) scale(1, -1)`}
      />
      {showAlert && (
        <use
          href="#icon-warning"
          x={0}
          y={0}
          width={alertSize}
          height={alertSize}
          className={alertIconClass}
          transform={`translate(${alertX} ${alertY}) scale(1, -1)`}
        />
      )}
      <text
        x={0}
        y={0}
        textAnchor="end"
        dominantBaseline="central"
        className={textClasses}
        fontSize={scaledFontSize}
        fontWeight="bold"
        fontFamily="sans-serif"
        transform={`translate(${badgeX + rectWidth / 2 - cornerRadius} ${badgeY}) scale(1, -1)`}
      >
        {label}
      </text>
    </g>
  )
}
