import { useId } from 'react'
import { useTranslation } from 'react-i18next'

interface LogoProps {
  className?: string
  compact?: boolean
}

export function Logo({ className = '', compact = false }: LogoProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const iconSize = compact ? 28 : 32
  const strawbaleId = useId()
  const postId = useId()
  const infillId = useId()
  const windowId = useId()
  const doorId = useId()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - stylized strawbale building section */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="-2.5 7.5 27.5 22"
        className="shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
      >
        <defs>
          <rect
            id={strawbaleId}
            x="0"
            y="0"
            width="3.5"
            height="2.5"
            stroke="#000000"
            fill="#daa520"
            strokeWidth="0.2"
            rx="0.3"
            ry="0.3"
          />
          <rect id={postId} x="0" y="0" width="0.5" height="12.5" stroke="#000000" fill="#cd853f" strokeWidth="0.2" />

          <g id={infillId}>
            <use x="0" y="0" href={`#${postId}`} />
            <use x="0.5" y="0" href={`#${strawbaleId}`} />
            <use x="0.5" y="2.5" href={`#${strawbaleId}`} />
            <use x="0.5" y="5" href={`#${strawbaleId}`} />
            <use x="0.5" y="7.5" href={`#${strawbaleId}`} />
            <use x="0.5" y="10" href={`#${strawbaleId}`} />
            <use x="4" y="0" href={`#${postId}`} />
          </g>
          <g id={windowId}>
            <use x="0" y="0" href={`#${postId}`} />
            <use x="0.5" y="0" href={`#${strawbaleId}`} />
            <rect x="0.5" y="2.5" width="3.5" height="5" stroke="#000000" fill="#87ceeb" strokeWidth="0.2" />
            <use x="0.5" y="7.5" href={`#${strawbaleId}`} />
            <use x="0.5" y="10" href={`#${strawbaleId}`} />
            <use x="4" y="0" href={`#${postId}`} />
          </g>
          <g id={doorId}>
            <use x="0" y="0" href={`#${postId}`} />
            <use x="0.5" y="0" href={`#${strawbaleId}`} />
            <rect x="0.5" y="2.5" width="3.5" height="10" stroke="#000000" fill="#8b4513" strokeWidth="0.2" />
            <use x="4" y="0" href={`#${postId}`} />
          </g>
        </defs>

        <rect x="1" y="28" width="20.5" height="1" fill="#8b4513" stroke="#000000" strokeWidth="0.2" />

        <use x="1" y="15.5" href={`#${infillId}`} />
        <use x="5" y="15.5" href={`#${windowId}`} />
        <use x="9" y="15.5" href={`#${infillId}`} />
        <use x="13" y="15.5" href={`#${doorId}`} />
        <use x="17" y="15.5" href={`#${infillId}`} />

        <rect x="1" y="14.5" width="20.5" height="1" fill="#8b4513" stroke="#000000" strokeWidth="0.2" />

        {/* Roof Structure */}
        <path d="M -2,14.5 h 26.5 L 10.75,8 Z" fill="#cd853f" stroke="#000000" strokeWidth="0.3" />
      </svg>

      {/* App Name - Only show if not compact */}
      {!compact && (
        <div className="flex flex-col">
          <div className="text-foreground text-lg leading-tight font-bold">{t($ => $.app.appName)}</div>
          <div className="text-muted-foreground text-xs leading-tight">{t($ => $.app.constructionPlanning)}</div>
        </div>
      )}
    </div>
  )
}
