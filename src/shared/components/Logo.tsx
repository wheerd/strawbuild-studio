import { COLORS } from '@/shared/theme/colors'

interface LogoProps {
  className?: string
  compact?: boolean
}

export function Logo({ className = '', compact = false }: LogoProps): React.JSX.Element {
  const iconSize = compact ? 28 : 32

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} ${className}`}>
      {/* Logo Icon - Strawbale Construction with visible bales and wood frame */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" className="flex-shrink-0">
        {/* Foundation/Base */}
        <rect x="1" y="28" width="30" height="3" fill="#8B4513" stroke="#654321" strokeWidth="0.3" />

        {/* Vertical Wood Posts */}
        <rect
          x="3"
          y="8"
          width="2.5"
          height="20"
          fill={COLORS.materials.woodSupport}
          stroke="#8B4513"
          strokeWidth="0.3"
        />
        <rect
          x="13.75"
          y="8"
          width="2.5"
          height="20"
          fill={COLORS.materials.woodSupport}
          stroke="#8B4513"
          strokeWidth="0.3"
        />
        <rect
          x="24.5"
          y="8"
          width="2.5"
          height="20"
          fill={COLORS.materials.woodSupport}
          stroke="#8B4513"
          strokeWidth="0.3"
        />

        {/* Horizontal Wood Beams */}
        <rect
          x="1"
          y="8"
          width="30"
          height="2"
          fill={COLORS.materials.woodSupport}
          stroke="#8B4513"
          strokeWidth="0.3"
        />
        <rect
          x="1"
          y="18"
          width="30"
          height="1.5"
          fill={COLORS.materials.woodSupport}
          stroke="#8B4513"
          strokeWidth="0.3"
        />

        {/* Individual Strawbales - Bottom Row */}
        <rect
          x="6"
          y="20"
          width="6"
          height="8"
          fill={COLORS.materials.strawbale}
          stroke="#C8860D"
          strokeWidth="0.4"
          rx="0.3"
        />
        <rect
          x="17"
          y="20"
          width="6"
          height="8"
          fill={COLORS.materials.strawbale}
          stroke="#C8860D"
          strokeWidth="0.4"
          rx="0.3"
        />

        {/* Individual Strawbales - Top Row (offset pattern) */}
        <rect
          x="2"
          y="10"
          width="6"
          height="8"
          fill={COLORS.materials.strawbale}
          stroke="#C8860D"
          strokeWidth="0.4"
          rx="0.3"
        />
        <rect
          x="9.5"
          y="10"
          width="6"
          height="8"
          fill={COLORS.materials.strawbale}
          stroke="#C8860D"
          strokeWidth="0.4"
          rx="0.3"
        />
        <rect
          x="21"
          y="10"
          width="6"
          height="8"
          fill={COLORS.materials.strawbale}
          stroke="#C8860D"
          strokeWidth="0.4"
          rx="0.3"
        />

        {/* Straw Texture on Bales */}
        <g stroke="#B8760C" strokeWidth="0.15" opacity="0.7">
          {/* Bottom row straw lines */}
          <line x1="6.5" y1="22" x2="11.5" y2="22" />
          <line x1="6.5" y1="24" x2="11.5" y2="24" />
          <line x1="6.5" y1="26" x2="11.5" y2="26" />
          <line x1="17.5" y1="22" x2="22.5" y2="22" />
          <line x1="17.5" y1="24" x2="22.5" y2="24" />
          <line x1="17.5" y1="26" x2="22.5" y2="26" />

          {/* Top row straw lines */}
          <line x1="2.5" y1="12" x2="7.5" y2="12" />
          <line x1="2.5" y1="14" x2="7.5" y2="14" />
          <line x1="2.5" y1="16" x2="7.5" y2="16" />
          <line x1="10" y1="12" x2="15" y2="12" />
          <line x1="10" y1="14" x2="15" y2="14" />
          <line x1="10" y1="16" x2="15" y2="16" />
          <line x1="21.5" y1="12" x2="26.5" y2="12" />
          <line x1="21.5" y1="14" x2="26.5" y2="14" />
          <line x1="21.5" y1="16" x2="26.5" y2="16" />
        </g>

        {/* Roof Structure */}
        <polygon points="1,8 16,2 31,8" fill={COLORS.materials.woodSupport} stroke="#8B4513" strokeWidth="0.4" />
        <line x1="16" y1="2" x2="16" y2="8" stroke="#8B4513" strokeWidth="0.4" />
        <line x1="8" y1="5" x2="8" y2="8" stroke="#8B4513" strokeWidth="0.3" />
        <line x1="24" y1="5" x2="24" y2="8" stroke="#8B4513" strokeWidth="0.3" />
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
