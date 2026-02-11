import { useZoom } from '@/editor/hooks/useViewportStore'
import type { Vec2 } from '@/shared/geometry'

interface ModeToggleBadgeProps {
  mode: 'center' | 'side'
  position: Vec2
  onClick: () => void
}

export function CenterModeToggleBadge({ mode, position, onClick }: ModeToggleBadgeProps): React.JSX.Element {
  const zoom = useZoom()

  const clampedScale = 0.2 / Math.max(0.02, Math.min(0.4, zoom))
  const iconSize = 100 * clampedScale
  const rectSize = 150 * clampedScale
  const strokeWidth = 8 * clampedScale
  const cornerRadius = rectSize * 0.2

  const path =
    mode === 'center'
      ? 'M6.99988 1C6.44759 1 5.99988 1.44772 5.99988 2V7H1.49988C1.22374 7 0.999878 7.22386 0.999878 7.5C0.999878 7.77614 1.22374 8 1.49988 8H5.99988V13C5.99988 13.5523 6.44759 14 6.99988 14H7.99988C8.55216 14 8.99988 13.5523 8.99988 13V8H13.4999C13.776 8 13.9999 7.77614 13.9999 7.5C13.9999 7.22386 13.776 7 13.4999 7H8.99988V2C8.99988 1.44772 8.55216 1 7.99988 1L6.99988 1Z'
      : 'M14.4999 0.999992C14.2237 0.999992 13.9999 1.22385 13.9999 1.49999L13.9999 5.99995L0.999992 5.99995L0.999992 1.49999C0.999992 1.22385 0.776136 0.999992 0.499996 0.999992C0.223856 0.999992 -9.78509e-09 1.22385 -2.18556e-08 1.49999L4.07279e-07 13.4999C3.95208e-07 13.776 0.223855 13.9999 0.499996 13.9999C0.776136 13.9999 0.999992 13.776 0.999992 13.4999L0.999992 8.99992L13.9999 8.99992L13.9999 13.4999C13.9999 13.776 14.2237 13.9999 14.4999 13.9999C14.776 13.9999 14.9999 13.776 14.9999 13.4999L14.9999 1.49999C14.9999 1.22385 14.776 0.999992 14.4999 0.999992Z'

  return (
    <g className="group cursor-pointer select-none" onClick={onClick}>
      <title>Toggle between side (S) and center (C) measurement modes</title>
      <rect
        className="fill-background group-hover:fill-accent stroke-input"
        x={position[0] - rectSize / 2}
        y={position[1] - rectSize / 2}
        width={rectSize}
        height={rectSize}
        rx={cornerRadius}
        ry={cornerRadius}
        strokeWidth={strokeWidth}
      />
      <path
        className="fill-foreground group-hover:fill-accent-foreground"
        transform={`translate(${position[0] - iconSize / 2} ${position[1] - iconSize / 2}) scale(${iconSize / 16})`}
        d={path}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </g>
  )
}
