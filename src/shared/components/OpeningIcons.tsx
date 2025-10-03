import React from 'react'

interface IconProps {
  className?: string
  width?: number
  height?: number
}

export function DoorIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wall lines */}
      <line x1="1" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <line x1="1" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="0.5" fill="none" />
      {/* Door frame */}
      <rect x="4" y="3" width="7" height="11" stroke="currentColor" strokeWidth="0.7" fill="none" />
      {/* Door handle */}
      <circle cx="9.5" cy="8.5" r="0.7" fill="currentColor" />
    </svg>
  )
}

export function WindowIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wall lines */}
      <line x1="1" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <line x1="1" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="0.5" fill="none" />
      {/* Window frame */}
      <rect x="4" y="4" width="7" height="7" stroke="currentColor" strokeWidth="0.7" fill="none" />
      {/* Window mullions */}
      <line x1="7.5" y1="4" x2="7.5" y2="11" stroke="currentColor" strokeWidth="0.5" />
      <line x1="4" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function PassageIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wall lines */}
      <line x1="1" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <line x1="1" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="0.5" fill="none" />
      {/* Opening frame */}
      <rect x="4" y="3" width="7" height="9" stroke="currentColor" strokeWidth="0.7" fill="none" />
    </svg>
  )
}

// Preset size icons
export function StandardDoorPresetIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Standard Door: 800×2100 (narrow and tall) */}
      <rect x="5" y="2" width="5" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export function WideDoorPresetIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wide Door: 900×2100 (wider and tall) */}
      <rect x="4" y="2" width="7" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="9.5" cy="7.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export function DoubleDoorPresetIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Double Door: 1600×2100 (very wide, two panels) */}
      <rect x="1" y="2" width="6" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="8" y="2" width="6" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="6" cy="7.5" r="0.4" fill="currentColor" />
      <circle cx="9" cy="7.5" r="0.4" fill="currentColor" />
    </svg>
  )
}

export function StandardWindowPresetIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Standard Window: 1200×1200 (perfect square) */}
      <rect x="3" y="3" width="9" height="9" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="7.5" y1="3" x2="7.5" y2="12" stroke="currentColor" strokeWidth="0.5" />
      <line x1="3" y1="7.5" x2="12" y2="7.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function SmallWindowPresetIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Small Window: 800×1200 (compact square-ish) */}
      <rect x="4" y="5" width="7" height="5" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="7.5" y1="5" x2="7.5" y2="10" stroke="currentColor" strokeWidth="0.5" />
      <line x1="4" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function FloorWindowPresetIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Floor Window: 1200×2000 (tall window, floor to ceiling) */}
      <rect x="4" y="1" width="7" height="12" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="1" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7.5" y1="1" x2="7.5" y2="13" stroke="currentColor" strokeWidth="0.5" />
      <line x1="4" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}
