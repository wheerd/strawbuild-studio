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
        <mask x="-1" y="-1" width="17" height="17" id="pencilMask" mask-type="luminance">
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
      <path d="M2 2 H 7.5 V 7.5 H 13 V 13 H 2 Z" stroke="currentColor" strokeWidth="1" mask="url(#pencilMask)" />
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

export function FloorAreaIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 3 H 12 L 14 14 H 1 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M6 3 L 5.33 14" stroke="currentColor" strokeWidth="0.7" />
      <path d="M9 3 L 9.66 14" stroke="currentColor" strokeWidth="0.7" />
      <path d="M2.33 6.66 h 3.44" stroke="currentColor" strokeWidth="0.7" />
      <path d="M9.66 10.33 h 3.88" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  )
}

export function FloorOpeningIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 3 H 12 L 14 14 H 1 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M5.3 5.3 H 9.1 L 9.8 11 H 4.8 Z" stroke="currentColor" strokeWidth="0.8" />
      <path d="M5.3 5.3 v 1.5 H 9.1 v -1.5" stroke="currentColor" strokeWidth="0.5" />
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

export function Model3DIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 512 454.63"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        clipRule="evenodd"
        fillRule="nonzero"
        d="M474.53 297.19c-3.03-12.25-10.85-23.5-23.14-31.67a2.86 2.86 0 01-1.13-3.27c.35-1.04.64-2.12.86-3.24.22-1.05.38-2.15.46-3.28l.11-2.01-.24-3.42a2.8 2.8 0 01.22-1.44c.62-1.45 2.3-2.12 3.75-1.5 21.45 9.21 37.46 22.94 46.87 38.6 7.37 12.25 10.7 25.71 9.46 39.13l-.01.08c-1.27 13.44-7.11 26.82-18.06 38.89-14.88 16.39-39.25 30.43-74.46 38.96l-1.7.41c-19.83 4.81-41.87 10.15-65.39 13.05l-.47.04a2.86 2.86 0 01-2.86-2.86V388.8a2.87 2.87 0 012.53-2.84c10.41-1.21 20.43-2.82 30.01-4.66 9.62-1.84 18.79-3.92 27.48-6.07 28.3-6.99 47.29-20.5 57.65-36.1 4.46-6.71 7.32-13.81 8.64-20.91 1.31-7.09 1.1-14.22-.58-21.03zM99.52 51.56L253.03.44c1.84-.62 3.75-.56 5.45.03V.44l155.55 53.28a8.564 8.564 0 015.8 8.88c.02.19.02.4.02.62v187.59h-.02c0 3.13-1.73 6.15-4.72 7.66l-154.44 78.48a8.624 8.624 0 01-4.45 1.24c-1.73 0-3.32-.51-4.67-1.38L96.76 256.07a8.597 8.597 0 01-4.61-7.61h-.03V60.09c0-4.35 3.21-7.93 7.4-8.53zm190.69 212.57l3.88-108.55 44.45-14.51c17.11-5.59 28.43-5.36 34.27.52 5.77 5.83 8.27 17.9 7.52 36.22-.73 18.29-4.28 32.5-10.68 42.71-6.46 10.3-18.07 18.85-35.12 25.73l-44.32 17.88zm47.76-96.17l-12.86 4.45-1.94 51.77 12.84-4.92c4.18-1.61 7.22-3.28 9.12-5.06 1.91-1.76 2.93-4.53 3.08-8.31l1.29-33.19c.14-3.79-.68-5.89-2.52-6.29-1.82-.42-4.83.09-9.01 1.55zm-150.1 12.57l.73-10.22c-3.2-2.29-8.38-5.39-15.54-9.31-7.08-3.87-15.9-7.56-26.39-11.08l-2.43-24.88c12.88 2.82 25.4 7.42 37.56 13.85 10.6 5.62 18.31 10.37 23.08 14.22 4.79 3.88 8.29 7.34 10.5 10.41 4.86 6.93 6.97 14.63 6.34 23.07-.8 10.69-6.02 15.79-15.61 15.27l-.06.8c10.71 10.54 15.67 21.61 14.8 33.11-.42 5.63-1.71 9.89-3.86 12.79-2.14 2.87-4.69 4.59-7.62 5.1-2.92.53-6.68.08-11.27-1.34-6.79-2.17-16.09-6.8-27.84-13.81-11.59-6.92-22.94-15.06-34.07-24.42l6-22.55c9.58 7.97 17.87 14 24.77 17.99 6.98 4.06 13.03 7.23 18.12 9.52l.72-10-27.15-18.26 1.57-22.36 27.65 12.1zm59.74 134.89V135.7L109.34 73.01v170.28l138.27 72.13zM402.62 75.06l-137.79 60.72v179.8l137.79-70.03V75.06zM255.65 17.63L124.87 61.19l131.4 59.59 131.4-57.91-132.02-45.24zM3.84 286.3c6.94-13.62 23.83-26.54 53.61-37.86.39-.16.82-.24 1.27-.21 1.57.11 2.76 1.47 2.66 3.04-.03.53.04 1.56.1 2.11.14 1.87.49 3.72 1.01 5.49.5 1.74 1.19 3.45 2.05 5.1l.18.32c.74 1.37.25 3.09-1.11 3.86-11.68 6.6-18.46 13.23-21.24 19.78-3.58 8.43-.31 17.06 7.65 25.55 8.52 9.07 22.24 17.89 38.81 26.08 54.49 26.97 138.89 46.87 171.76 47.77v-27.72c.01-.67.24-1.34.72-1.88a2.858 2.858 0 014.02-.27c17.19 15.1 35.95 30.16 52.06 46.27a2.846 2.846 0 01-.05 4.03c-16.47 15.93-34.68 30.92-51.92 46.08-.51.49-1.21.79-1.97.79-1.58 0-2.86-1.29-2.86-2.87v-25.74c-58.7 1.19-154.52-27.16-211.85-63.77-18.02-11.5-32.34-23.89-40.63-36.49-8.64-13.13-10.88-26.51-4.27-39.46z"
      />
    </svg>
  )
}

export function ConstructionPlanIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 122.88 110.81"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        d="M94.67,91.86a2.49,2.49,0,0,1,0-5h4.79V68H94.82a2.49,2.49,0,0,1,0-5h4.64V36.52H79.84V63.05h4.65a2.49,2.49,0,0,1,0,5H79.84v5.18a2.49,2.49,0,1,1-5,0V36.52H41.33V54.35H57.75a2.48,2.48,0,0,1,2.49,2.48V86.88H74.78V82.24a2.49,2.49,0,1,1,5,0v4.64h5.89a2.49,2.49,0,0,1,0,5H38.84a2.49,2.49,0,0,1-2.49-2.49V34a2.5,2.5,0,0,1,2.49-2.49H102A2.5,2.5,0,0,1,104.44,34V89.37A2.49,2.49,0,0,1,102,91.86ZM5.31,82.2,5.59,82a14.5,14.5,0,0,1,1.62-1.24,16.59,16.59,0,0,1,3.71-1.82A24.82,24.82,0,0,1,14.44,78V5.1C5.18,6.52,5.24,15.82,5.29,24.48c.24,12-.54,43.62,0,57.72Zm14-2.06a2.53,2.53,0,0,1-.59,1.45,2.43,2.43,0,0,1-1.5.82h0a28,28,0,0,0-4,.87,12.51,12.51,0,0,0-3.29,1.5,10.62,10.62,0,0,0-2.56,2.43A16.58,16.58,0,0,0,5.27,91a21.74,21.74,0,0,0,.41,5.48,11.91,11.91,0,0,0,1.83,4.35l0,0a10.39,10.39,0,0,0,3.53,3.1,17.49,17.49,0,0,0,5.67,1.86h101.2V19H19.36V80.14Zm0-66h100a3.61,3.61,0,0,1,1.35.27,3.6,3.6,0,0,1,1.93,1.93,3.62,3.62,0,0,1,.27,1.36v89.59a3.61,3.61,0,0,1-.27,1.35,3.74,3.74,0,0,1-.77,1.15h0a3.74,3.74,0,0,1-1.15.77,3.43,3.43,0,0,1-1.35.27H16.58a15.94,15.94,0,0,1-7.15-2.12,17.62,17.62,0,0,1-5.92-5,16.81,16.81,0,0,1-2.6-6,27.37,27.37,0,0,1-.52-7.2c0-21.49-.88-44.78,0-66,0-5.7-.07-11.63,1.92-16.24S8.45.16,16.64,0h.26a2.46,2.46,0,0,1,2.46,2.46V14.11Zm22,45.21V86.88H55.26V59.32Z"
      />
    </svg>
  )
}

export function SaveIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg
      fill="currentColor"
      width={width}
      height={height}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M35.2673988,6.0411h-7.9999981v10h7.9999981V6.0411z M33.3697014,14.1434002h-4.2046013V7.9387999h4.2046013V14.1434002z" />
      <path
        d="M41,47.0410995H21c-0.5527992,0-1,0.4472008-1,1c0,0.5527,0.4472008,1,1,1h20c0.5527,0,1-0.4473,1-1
		C42,47.4883003,41.5527,47.0410995,41,47.0410995z"
      />
      <path
        d="M41,39.0410995H21c-0.5527992,0-1,0.4472008-1,1c0,0.5527,0.4472008,1,1,1h20c0.5527,0,1-0.4473,1-1
		C42,39.4883003,41.5527,39.0410995,41,39.0410995z"
      />
      <path d="M12,56.0410995h38v-26H12V56.0410995z M14,32.0410995h34v22H14V32.0410995z" />
      <path
        d="M49.3811989,0.0411L49.3610992,0H7C4.7908001,0,3,1.7909,3,4v56c0,2.2092018,1.7908001,4,4,4h50
		c2.2090988,0,4-1.7907982,4-4V11.6962996L49.3811989,0.0411z M39.9604988,2.0804999v17.9211006H14.0394001V2.0804999H39.9604988z
		 M59,60c0,1.1027985-0.8972015,2-2,2H7c-1.1027999,0-2-0.8972015-2-2V4c0-1.1027999,0.8972001-2,2-2h5v20.0410995h30V2h6.5099983
		L59,12.5228996V60z"
      />
    </svg>
  )
}

export function MidCutYIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1 7.5 H 14 V 14 H 1Z" stroke="currentColor" strokeWidth="1" />
      <path d="M1 1 H 14 V 7.5 H 1Z" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
    </svg>
  )
}

export function MidCutXIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1 1 H 7.5 V 14 H 1Z" stroke="currentColor" strokeWidth="1" />
      <path d="M7.5 1 H 14 V 14 H 7.5Z" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
    </svg>
  )
}

export function TopPlateIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 1 H 10 V 3 H 4Z" fill="currentColor" />
      <path d="M4 3 H 10 V 14 H 4Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
    </svg>
  )
}

export function BasePlateIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 1 H 10 V 12 H 4Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
      <path d="M4 12 H 10 V 14 H 4Z" fill="currentColor" />
    </svg>
  )
}

export function WallToggleIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 1 H 10 V 3 H 4Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
      <path d="M4 3 H 10 V 12 H 4Z" fill="currentColor" />
      <path d="M4 12 H 10 V 14 H 4Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
    </svg>
  )
}

export function WallLayersIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 1 H 10 V 14 H 4Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
      <path d="M3.5 1 H 5 V 14 H 3.5Z" fill="currentColor" />
      <path d="M9 1 H 10 V 14 H 9Z" fill="currentColor" />
    </svg>
  )
}

export function FloorLayersIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1.5 4 H 13.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M2.5 7 H 12.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
      <path d="M3.5 10 H 11.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      <path d="M4.5 13 H 10.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

export function RoofIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7.5 2 L 13 11 H 2 Z" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M 1 12 L 7.5 2 L 14 12" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

export function SawIcon({ width = 15, height = 15, ...props }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 256 256"
      {...props}
    >
      <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
        <path
          d="M 19.109 88.372 c -0.197 0 -0.395 -0.013 -0.591 -0.039 c -1.224 -0.165 -2.334 -0.839 -3.045 -1.848 L 1.504 66.689 C -0.965 63.191 -0.308 58.322 3 55.604 l 12.537 -10.307 c 1.747 -1.436 4.261 -1.411 5.981 0.057 l 6.652 5.686 c 1.5 1.282 2.665 2.935 3.368 4.779 l 5.669 14.886 c 0.713 1.87 0.153 3.981 -1.395 5.253 l -13.869 11.4 C 21.144 88.017 20.135 88.372 19.109 88.372 z M 18.494 46.236 c -0.598 0 -1.195 0.202 -1.686 0.605 L 4.27 57.148 c -2.503 2.057 -3 5.741 -1.132 8.389 l 13.968 19.796 l 0 0 c 0.398 0.563 0.995 0.926 1.679 1.018 c 0.683 0.095 1.355 -0.099 1.888 -0.537 l 13.87 -11.4 c 0.882 -0.726 1.202 -1.93 0.795 -2.996 l -5.669 -14.886 c -0.584 -1.532 -1.552 -2.906 -2.799 -3.972 l -6.651 -5.686 C 19.722 46.45 19.108 46.236 18.494 46.236 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 19.801 76.421 c -0.214 0 -0.428 -0.016 -0.641 -0.047 c -1.239 -0.181 -2.352 -0.88 -3.052 -1.919 l 0 0 l -4.212 -6.25 c -2.381 -3.532 -1.695 -8.236 1.595 -10.941 l 2.84 -2.334 c 1.22 -1.004 2.977 -0.986 4.178 0.038 l 1.933 1.649 c 1.159 0.989 2.067 2.262 2.625 3.68 l 3.036 7.697 c 0.52 1.318 0.133 2.808 -0.96 3.707 l -4.508 3.706 C 21.833 76.065 20.827 76.421 19.801 76.421 z M 17.767 73.338 c 0.392 0.58 0.989 0.956 1.682 1.058 c 0.697 0.1 1.374 -0.089 1.916 -0.533 l 4.508 -3.706 c 0.422 -0.347 0.571 -0.921 0.371 -1.428 l -3.036 -7.698 c -0.439 -1.114 -1.152 -2.114 -2.063 -2.892 l -1.933 -1.649 c -0.461 -0.395 -1.139 -0.401 -1.609 -0.015 l -2.84 2.334 c -2.49 2.047 -3.008 5.606 -1.207 8.279 L 17.767 73.338 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 33.729 65.388 c -0.074 0 -0.149 -0.008 -0.224 -0.025 c -0.325 -0.074 -0.592 -0.307 -0.711 -0.619 l -3.126 -8.211 c -0.584 -1.533 -1.552 -2.907 -2.799 -3.974 l -6.456 -5.518 c -0.225 -0.192 -0.354 -0.475 -0.35 -0.771 c 0.003 -0.296 0.138 -0.576 0.368 -0.763 L 71.138 4.12 c 4.417 -3.606 10.79 -3.283 14.821 0.749 l 3.748 3.748 C 89.895 8.804 90 9.058 90 9.323 s -0.105 0.52 -0.293 0.707 l -3.96 3.96 c -0.317 0.317 -0.808 0.383 -1.196 0.165 c -1.002 -0.563 -2.262 -0.396 -3.065 0.41 c -0.804 0.804 -0.972 2.064 -0.41 3.065 c 0.22 0.391 0.152 0.879 -0.165 1.196 l -2.301 2.301 c -0.317 0.317 -0.808 0.383 -1.196 0.165 c -1.001 -0.563 -2.262 -0.395 -3.065 0.41 c -0.804 0.804 -0.972 2.064 -0.41 3.065 c 0.22 0.391 0.152 0.879 -0.165 1.196 l -2.301 2.301 c -0.318 0.316 -0.808 0.383 -1.196 0.165 c -1.001 -0.563 -2.262 -0.395 -3.065 0.41 c -0.804 0.804 -0.972 2.064 -0.41 3.066 c 0.22 0.391 0.151 0.879 -0.165 1.196 l -2.301 2.301 c -0.317 0.317 -0.808 0.383 -1.196 0.165 c -1.003 -0.562 -2.263 -0.393 -3.065 0.41 c -0.804 0.803 -0.972 2.064 -0.41 3.065 c 0.22 0.391 0.151 0.879 -0.165 1.196 l -2.301 2.301 c -0.317 0.317 -0.807 0.382 -1.196 0.165 c -1.003 -0.562 -2.263 -0.392 -3.065 0.41 c -0.804 0.804 -0.972 2.064 -0.41 3.066 c 0.22 0.391 0.151 0.88 -0.165 1.196 l -2.301 2.301 c -0.317 0.316 -0.807 0.383 -1.197 0.165 c -1.001 -0.563 -2.263 -0.396 -3.065 0.409 c -0.804 0.804 -0.972 2.064 -0.41 3.066 c 0.219 0.391 0.152 0.88 -0.165 1.196 l -2.301 2.301 c -0.316 0.317 -0.805 0.385 -1.196 0.165 c -1 -0.562 -2.261 -0.393 -3.065 0.41 c -0.803 0.804 -0.972 2.063 -0.41 3.065 c 0.225 0.4 0.148 0.901 -0.186 1.217 l -3.647 3.44 C 34.228 65.292 33.982 65.388 33.729 65.388 z M 22.624 46.299 l 5.546 4.74 c 1.501 1.282 2.666 2.937 3.368 4.782 l 2.594 6.813 l 2.043 -1.928 c -0.568 -1.631 -0.174 -3.484 1.069 -4.728 c 1.25 -1.249 3.114 -1.641 4.749 -1.063 l 1.327 -1.326 c -0.58 -1.637 -0.188 -3.501 1.062 -4.75 s 3.115 -1.64 4.75 -1.062 l 1.326 -1.327 c -0.579 -1.635 -0.187 -3.5 1.063 -4.749 s 3.112 -1.641 4.748 -1.062 l 1.327 -1.327 c -0.579 -1.636 -0.187 -3.5 1.063 -4.749 s 3.112 -1.641 4.748 -1.062 l 1.327 -1.327 c -0.579 -1.636 -0.187 -3.5 1.063 -4.749 c 1.25 -1.25 3.113 -1.641 4.749 -1.062 l 1.326 -1.327 c -0.579 -1.636 -0.187 -3.5 1.063 -4.749 c 1.25 -1.25 3.114 -1.64 4.749 -1.062 l 1.326 -1.327 c -0.579 -1.636 -0.187 -3.5 1.063 -4.749 c 1.251 -1.25 3.113 -1.641 4.749 -1.062 l 2.766 -2.766 l -3.041 -3.041 C 81.241 2.98 76.021 2.714 72.401 5.67 L 22.624 46.299 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 28.099 41.539 c -0.25 0 -0.5 -0.093 -0.694 -0.28 L 0.306 15.163 C 0.111 14.974 0 14.714 0 14.442 s 0.11 -0.532 0.306 -0.72 L 12.575 1.907 c 0.388 -0.373 1 -0.373 1.388 0 l 28.111 27.071 c 0.397 0.383 0.41 1.016 0.026 1.414 c -0.382 0.398 -1.016 0.411 -1.414 0.026 L 13.269 4.016 L 2.441 14.442 l 26.351 25.376 c 0.397 0.383 0.41 1.016 0.026 1.414 C 28.623 41.436 28.361 41.539 28.099 41.539 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 76.731 88.373 c -0.25 0 -0.5 -0.093 -0.693 -0.279 L 42.526 55.821 c -0.397 -0.384 -0.41 -1.017 -0.026 -1.414 s 1.017 -0.409 1.414 -0.027 l 32.818 31.604 l 10.827 -10.427 L 52.98 42.258 c -0.398 -0.383 -0.41 -1.016 -0.027 -1.414 c 0.384 -0.398 1.019 -0.409 1.414 -0.026 l 35.326 34.019 C 89.89 75.025 90 75.286 90 75.558 s -0.11 0.532 -0.307 0.721 L 77.425 88.094 C 77.231 88.28 76.981 88.373 76.731 88.373 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 64.801 63.272 c -0.262 0 -0.524 -0.103 -0.721 -0.307 c -0.383 -0.397 -0.371 -1.03 0.027 -1.414 l 4.888 -4.707 c 0.396 -0.381 1.031 -0.371 1.414 0.027 c 0.383 0.397 0.371 1.03 -0.027 1.414 l -4.888 4.707 C 65.301 63.18 65.051 63.272 64.801 63.272 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 27.064 26.932 c -0.262 0 -0.524 -0.103 -0.72 -0.306 c -0.383 -0.398 -0.371 -1.031 0.026 -1.414 l 4.888 -4.707 c 0.399 -0.383 1.032 -0.371 1.414 0.026 c 0.383 0.398 0.371 1.031 -0.026 1.414 l -4.888 4.707 C 27.563 26.839 27.313 26.932 27.064 26.932 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 56.553 53.045 c -0.262 0 -0.524 -0.103 -0.721 -0.307 c -0.383 -0.397 -0.371 -1.03 0.027 -1.414 l 3.701 -3.564 c 0.396 -0.381 1.03 -0.371 1.414 0.027 c 0.383 0.397 0.371 1.03 -0.027 1.414 l -3.701 3.564 C 57.053 52.952 56.803 53.045 56.553 53.045 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 75.421 71.216 c -0.262 0 -0.524 -0.103 -0.721 -0.307 c -0.383 -0.397 -0.371 -1.03 0.027 -1.414 l 3.701 -3.564 c 0.396 -0.381 1.03 -0.372 1.414 0.027 c 0.383 0.397 0.371 1.03 -0.027 1.414 l -3.701 3.564 C 75.921 71.123 75.671 71.216 75.421 71.216 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 18.816 16.705 c -0.262 0 -0.524 -0.103 -0.72 -0.306 c -0.383 -0.398 -0.371 -1.031 0.026 -1.414 l 3.702 -3.565 c 0.399 -0.383 1.032 -0.371 1.414 0.026 c 0.383 0.398 0.371 1.031 -0.026 1.414 l -3.702 3.565 C 19.315 16.612 19.065 16.705 18.816 16.705 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
        <path
          d="M 76.684 82.396 c -0.852 0 -1.702 -0.312 -2.351 -0.937 c -0.64 -0.616 -0.992 -1.438 -0.992 -2.314 s 0.353 -1.699 0.993 -2.315 c 1.295 -1.249 3.402 -1.248 4.699 0.001 c 0.64 0.615 0.992 1.438 0.992 2.314 s -0.353 1.699 -0.993 2.315 C 78.385 82.085 77.534 82.396 76.684 82.396 z M 76.683 77.888 c -0.348 0 -0.696 0.128 -0.961 0.383 c -0.246 0.236 -0.381 0.547 -0.381 0.875 s 0.135 0.639 0.38 0.874 c 0 0 0 0.001 0.001 0.001 c 0.529 0.509 1.394 0.511 1.923 0 c 0.246 -0.236 0.381 -0.547 0.381 -0.875 s -0.135 -0.639 -0.38 -0.874 C 77.38 78.016 77.031 77.888 76.683 77.888 z"
          fill="currentColor"
          fillRule="nonzero"
          transform=" matrix(1 0 0 1 0 0) "
          stroke-linecap="round"
        />
      </g>
    </svg>
  )
}
