import React from 'react'

export interface IconProps extends React.SVGAttributes<SVGElement> {
  children?: never
  color?: string
}

export function SplitWallIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M0.25 1C0.25 0.585786 0.585786 0.25 1 0.25H14C14.4142 0.25 14.75 0.585786 14.75 1V14C14.75 14.4142 14.4142 14.75 14 14.75H1C0.585786 14.75 0.25 14.4142 0.25 14V1ZM1.75 1.75V13.25H13.25V1.75H1.75Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <rect x="7" y="5" width="1" height="1" rx=".5" fill="currentColor" />
      <rect x="7" y="3" width="1" height="1" rx=".5" fill="currentColor" />
      <rect x="7" y="7" width="1" height="1" rx=".5" fill="currentColor" />
      <rect x="7" y="9" width="1" height="1" rx=".5" fill="currentColor" />
      <rect x="7" y="11" width="1" height="1" rx=".5" fill="currentColor" />
    </svg>
  )
}

export function PerimeterDrawIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <mask x="-1" y="-1" width="17" height="17" id="myMask" mask-type="luminance">
          <rect x="-1" y="-1" width="17" height="17" fill="white" />
          <path
            transform="translate(5 2) scale(0.7)"
            d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645Z"
            fill="black"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </mask>
      </defs>
      <path
        transform="translate(5 2) scale(0.7)"
        d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42166 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42166 9.28547Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path d="M2 2 H 7.5 V 7.5 H 13 V 13 H 2 Z" stroke="currentColor" strokeWidth="1" mask="url(#myMask)" />
    </svg>
  )
}

export function PerimeterPresetsIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 5 V 2 H 13 V 10 H 12" stroke="currentColor" strokeWidth="1" />
      <path d="M2 5 H 7.5 V 9 H 12 V 13 H 2 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function OpeningsIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1" y="3" width="6" height="11" stroke="currentColor" strokeWidth="0.7" fill="none" />
      {/* Door handle */}
      <circle cx="2.5" cy="8.5" r="0.7" fill="currentColor" />

      <rect x="9" y="4" width="5" height="7" stroke="currentColor" strokeWidth="0.7" fill="none" />
      {/* Window mullions */}
      <line x1="11.5" y1="4" x2="11.5" y2="11" stroke="currentColor" strokeWidth="0.5" />
      <line x1="9" y1="7.5" x2="14" y2="7.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export function FitToViewIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7.5 0.5 L9.75 2.5 H5.25 Z
           M7.5 14.5 L9.75 12.5 H5.25 Z
           M0.5 7.5 L2.5 9.75 V5.25 Z
           M14.5 7.5 L12.5 9.75 V5.25 Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        transform="translate(2 2) scale(0.8)"
        d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5Z
        M9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}
