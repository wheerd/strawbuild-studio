import { COLORS } from '@/shared/theme/colors'

interface LogoProps {
  className?: string
  compact?: boolean
}

export function Logo({ className = '', compact = false }: LogoProps): React.JSX.Element {
  const iconSize = compact ? 28 : 32

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - Strawbale Construction with visible bales and wood frame */}
      <svg width={iconSize} height={iconSize} viewBox="-2.5 7.5 27.5 22" className="flex-shrink-0">
        <defs>
          <rect id="strawbale" x="0" y="0" width="3.5" height="2.5" stroke="black" fill="#daa520" strokeWidth="0.2" />
          <rect id="post" x="0" y="0" width="0.5" height="12.5" stroke="black" fill="#cd853f" strokeWidth="0.2" />

          <g id="infill-section">
            <use x="0" y="0" href="#post" />
            <use x="0.5" y="0" href="#strawbale" />
            <use x="0.5" y="2.5" href="#strawbale" />
            <use x="0.5" y="5" href="#strawbale" />
            <use x="0.5" y="7.5" href="#strawbale" />
            <use x="0.5" y="10" href="#strawbale" />
            <use x="4" y="0" href="#post" />
          </g>
          <g id="window-section">
            <use x="0" y="0" href="#post" />
            <use x="0.5" y="0" href="#strawbale" />
            <rect x="0.5" y="2.5" width="3.5" height="5" stroke="black" fill="#87ceeb" strokeWidth="0.2" />
            <use x="0.5" y="7.5" href="#strawbale" />
            <use x="0.5" y="10" href="#strawbale" />
            <use x="4" y="0" href="#post" />
          </g>
          <g id="door-section">
            <use x="0" y="0" href="#post" />
            <use x="0.5" y="0" href="#strawbale" />
            <rect x="0.5" y="2.5" width="3.5" height="10" stroke="black" fill="#8b4513" strokeWidth="0.2" />
            <use x="4" y="0" href="#post" />
          </g>
        </defs>

        <rect x="1" y="28" width="20.5" height="1" fill="#8B4513" stroke="black" strokeWidth="0.2" />

        <use x="1" y="15.5" href="#infill-section" />
        <use x="5" y="15.5" href="#window-section" />
        <use x="9" y="15.5" href="#infill-section" />
        <use x="13" y="15.5" href="#door-section" />
        <use x="17" y="15.5" href="#infill-section" />

        <rect x="1" y="14.5" width="20.5" height="1" fill="#8B4513" stroke="black" strokeWidth="0.2" />

        {/* Roof Structure */}
        <path d="M -2,14.5 h 26.5 L 10.75,8 Z" fill={COLORS.materials.woodSupport} stroke="black" strokeWidth="0.3" />
      </svg>

      {/* App Name - Only show if not compact */}
      {!compact && (
        <div className="flex flex-col">
          <div className="text-lg font-bold text-gray-800 leading-tight">Strawbaler</div>
          <div className="text-xs text-gray-500 leading-tight">Construction Planning</div>
        </div>
      )}
    </div>
  )
}
