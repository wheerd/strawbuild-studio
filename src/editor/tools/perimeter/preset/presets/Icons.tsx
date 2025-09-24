import React from 'react'

interface IconProps {
  className?: string
  width?: number
  height?: number
}

export function RectIcon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M2 3 H 13 V 12 H 2 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/**
 * L-shaped icon at 0° rotation (extension at bottom-right)
 * Creates a proper L-shape outline that looks like a continuous shape
 */
export function LShape0Icon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M2 2 H 7.5 V 7.5 H 13 V 13 H 2 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/**
 * L-shaped icon at 90° rotation (extension at bottom-left)
 */
export function LShape90Icon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M7.5 2 H 13 V 13 H 2 V 7.5 H 7.5 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/**
 * L-shaped icon at 180° rotation (extension at top-left)
 */
export function LShape180Icon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M2 2 H 13 V 13 H 7.5 V 7.5 H 2 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/**
 * L-shaped icon at 270° rotation (extension at top-right)
 */
export function LShape270Icon({ className, width = 15, height = 15 }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M2 2 H 13 V 7.5 H 7.5 V 13 H 2 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
