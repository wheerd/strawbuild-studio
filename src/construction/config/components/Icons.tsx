import { SquareIcon, ViewVerticalIcon } from '@radix-ui/react-icons'
import React, { type ComponentType } from 'react'

import type { WallAssemblyConfig } from '@/construction/config/types'
import type { FloorAssemblyType } from '@/construction/floors/types'
import type { RoofAssemblyType } from '@/construction/roofs/types'

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

export function getPerimeterConfigTypeIcon(type: WallAssemblyConfig['type']) {
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

export function MonolithicIcon({ className, width = 15, height = 15, style }: IconProps): React.JSX.Element {
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
      <rect x="2" y="5" width="11" height="5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function JoistIcon({ className, width = 15, height = 15, style }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 40 115 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <rect
        x="10"
        y="50"
        width="15"
        height="24"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.5}
        strokeWidth="1"
      />
      <rect
        x="50"
        y="50"
        width="15"
        height="24"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.5}
        strokeWidth="1"
      />
      <rect
        x="90"
        y="50"
        width="15"
        height="24"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.5}
        strokeWidth="1"
      />
      <line x1="2" y1="50" x2="113" y2="50" stroke="currentColor" strokeWidth="10" />
    </svg>
  )
}

export function FilledIcon({ className, width = 15, height = 15, style }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 40 115 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <rect
        x="10"
        y="50"
        width="15"
        height="36"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.7}
        strokeWidth="1"
      />
      <rect x="25" y="50" width="25" height="36" fill="currentColor" fillOpacity={0.3} />
      <rect
        x="50"
        y="50"
        width="15"
        height="36"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.7}
        strokeWidth="1"
      />
      <rect x="65" y="50" width="25" height="36" fill="currentColor" fillOpacity={0.3} />
      <rect
        x="90"
        y="50"
        width="15"
        height="36"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.7}
        strokeWidth="1"
      />
      <line x1="2" y1="50" x2="113" y2="50" stroke="currentColor" strokeWidth="5" />
      <line x1="2" y1="86" x2="113" y2="86" stroke="currentColor" strokeWidth="5" />
    </svg>
  )
}

export function getFloorAssemblyTypeIcon(type: FloorAssemblyType): ComponentType<IconProps> {
  switch (type) {
    case 'monolithic':
      return MonolithicIcon
    case 'joist':
      return JoistIcon
    case 'filled':
      return FilledIcon
  }
}

export function getRoofAssemblyTypeIcon(type: RoofAssemblyType): ComponentType<IconProps> {
  switch (type) {
    case 'monolithic':
      return MonolithicIcon
    case 'purlin':
      return FilledIcon
  }
}
