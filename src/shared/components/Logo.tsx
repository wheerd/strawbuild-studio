import { useTranslation } from 'react-i18next'

interface LogoProps {
  className?: string
  compact?: boolean
}

export function Logo({ className = '', compact = false }: LogoProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const iconSize = 36
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="-3 -3 37 37">
        <defs>
          <filter id="inset-shadow">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0 
                      0 0 0 0 0 
                      0 0 0 0 0 
                      0 0 0 100 0"
              result="opaque-source"
            />
            <feGaussianBlur stdDeviation="2" />
            <feComposite operator="xor" in2="opaque-source" />
            <feComposite operator="in" in2="opaque-source" />
            <feComposite operator="over" in2="SourceGraphic" />
          </filter>
        </defs>

        <rect x="-2" y="-2" width="35" height="35" fill="#2b4d4c" rx="4" ry="4" filter="url(#inset-shadow)" />

        <rect x="1" y="2" width="29" height="4" stroke="#d37c37" fill="#ed913e" strokeWidth="0.2" />
        <rect x="1" y="5" width="29" height="1" fill="#ab6a32" />

        <rect x="19" y="6" width="5" height="24" stroke="#d37c37" fill="#ed913e" strokeWidth="0.2" />
        <rect x="23" y="6" width="1" height="24" fill="#d37c37" />

        <rect x="3" y="8" width="14" height="10" fill="#fdc362" />
        <rect x="3" y="19.5" width="14" height="9" fill="#e0ab4f" />
        <rect x="25.5" y="7" width="3" height="21.5" fill="#e0ab4f" />
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
