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
      <line x1="1" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <line x1="1" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="0.5" fill="none" />

      {/* Opening frame */}
      <rect x="4" y="3" width="7" height="9" stroke="currentColor" strokeWidth="0.7" fill="none" />
    </svg>
  )
}

// Preset size icons
export function StandardSizeIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="4" width="11" height="7" stroke="currentColor" strokeWidth="1" fill="none" />
      <text x="7.5" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="4" fill="currentColor">
        S
      </text>
    </svg>
  )
}

export function WideSizeIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="1" y="5" width="13" height="5" stroke="currentColor" strokeWidth="1" fill="none" />
      <text x="7.5" y="7.5" textAnchor="middle" dominantBaseline="middle" fontSize="4" fill="currentColor">
        W
      </text>
    </svg>
  )
}

export function DoubleSizeIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="1" y="4" width="6" height="7" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="8" y="4" width="6" height="7" stroke="currentColor" strokeWidth="1" fill="none" />
      <text x="7.5" y="12.5" textAnchor="middle" dominantBaseline="middle" fontSize="3" fill="currentColor">
        2x
      </text>
    </svg>
  )
}

export function LargeSizeIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="2" width="11" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <text x="7.5" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="4" fill="currentColor">
        L
      </text>
    </svg>
  )
}

export function SmallSizeIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="5" width="7" height="5" stroke="currentColor" strokeWidth="1" fill="none" />
      <text x="7.5" y="7.5" textAnchor="middle" dominantBaseline="middle" fontSize="3" fill="currentColor">
        S
      </text>
    </svg>
  )
}

export function FloorSizeIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="3" y="2" width="9" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="1" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="2" />
      <text x="7.5" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="3" fill="currentColor">
        F
      </text>
    </svg>
  )
}
