import { SquareIcon, ViewVerticalIcon } from '@radix-ui/react-icons'
import React from 'react'

import type { PerimeterConstructionConfig } from '@/construction/config/types'

interface IconProps {
  className?: string
  width?: number
  height?: number
  style?: React.CSSProperties
}

export function NonStrawbaleIcon({ className, width = 15, height = 15, style }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <rect x="2" y="2" width="11.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function InfillIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 1 15.5 14.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="2" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="2" y="4.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="2" y="7" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="2" y="9.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="2" y="12" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="6" y="2" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="4.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="7" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="9.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="12" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="10" y="2" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="10" y="4.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="10" y="7" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="10" y="9.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="10" y="12" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function StrawhengeIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 1 15.5 14.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="6" y="2" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="4.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="7" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="9.5" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6" y="12" width="3.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="10" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function ModulesIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 1 15.5 14.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="6" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="10" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function getPerimeterConfigTypeIcon(type: PerimeterConstructionConfig['type']) {
  switch (type) {
    case 'infill':
      return InfillIcon
    case 'strawhenge':
      return StrawhengeIcon
    case 'modules':
      return ModulesIcon
    case 'non-strawbale':
      return NonStrawbaleIcon
  }
}

export function getRingBeamTypeIcon(type: 'full' | 'double') {
  switch (type) {
    case 'full':
      return SquareIcon
    case 'double':
      return ViewVerticalIcon
  }
}
