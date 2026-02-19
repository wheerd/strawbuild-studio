import { TriangleAlert } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { VERSION_INFO } from '@/shared/utils/version'

import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'

function GitHubIcon({ width = 24, height = 24, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

export type OpenMode = 'first-visit' | 'manual'

export interface WelcomeModalProps {
  isOpen: boolean
  mode: OpenMode
  onAccept: () => void
  trigger?: React.ReactNode
}

export function WelcomeModal({ isOpen, mode, onAccept, trigger }: WelcomeModalProps): React.JSX.Element {
  const { t } = useTranslation('welcome')
  const isFirstVisit = mode === 'first-visit'

  const handleOpenChange = (open: boolean): void => {
    if (!isFirstVisit && !open) {
      onAccept()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        aria-describedby={undefined}
        className="h-full max-h-[90vh] max-w-[90vw] overflow-y-auto"
        onEscapeKeyDown={e => {
          if (isFirstVisit) e.preventDefault()
        }}
        onPointerDownOutside={e => {
          if (isFirstVisit) e.preventDefault()
        }}
        onInteractOutside={e => {
          if (isFirstVisit) e.preventDefault()
        }}
        showCloseButton={!isFirstVisit}
      >
        <div className="flex flex-col gap-4">
          <DialogTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo />
              </div>
              <div className="flex items-center gap-2 pr-5">
                <LanguageSwitcher size="lg" />
              </div>
            </div>
          </DialogTitle>

          <div className="mt--2 flex flex-col gap-3 p-0">
            <span>{t($ => $.introduction)}</span>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <h3>{t($ => $.keyFeatures.title)}</h3>
                <div className="text-sm">
                  <ul className="m-0 list-disc pl-6">
                    {(
                      t($ => $.keyFeatures.items, {
                        returnObjects: true
                      }) as string[]
                    ).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3>{t($ => $.plannedFeatures.title)}</h3>
                <div className="text-sm">
                  <ul className="m-0 list-disc pl-6">
                    {(
                      t($ => $.plannedFeatures.items, {
                        returnObjects: true
                      }) as string[]
                    ).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <h3>{t($ => $.demoVideo.title)}</h3>
                <span className="text-base">{t($ => $.demoVideo.description)}</span>
                <div className="flex flex-row items-center gap-4">
                  <a
                    className="font-bold underline"
                    href="https://www.youtube.com/watch?v=oe9VnhEW0JE"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.demoVideo.demo01)}
                  </a>
                  <a
                    className="font-bold underline"
                    href="https://www.youtube.com/watch?v=7Ed09YNGSn8"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.demoVideo.demo02)}
                  </a>
                </div>
                <h3>{t($ => $.localStorage.title)}</h3>
                <div className="text-sm">
                  {t($ => $.localStorage.description)}
                  <ul className="mt-2 pl-6">
                    {(
                      t($ => $.localStorage.items, {
                        returnObjects: true
                      }) as string[]
                    ).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <span className="text-base">{t($ => $.localStorage.privacy)}</span>
              </div>

              <Callout color="orange" variant="soft">
                <CalloutIcon>
                  <TriangleAlert />
                </CalloutIcon>
                <CalloutText>
                  <span className="flex flex-col gap-2">
                    <span className="font-bold">{t($ => $.disclaimer.title)}</span>
                    <span>{t($ => $.disclaimer.intro)}</span>
                    <span className="ml-4 flex flex-col gap-0">
                      {(
                        t($ => $.disclaimer.items, {
                          returnObjects: true
                        }) as string[]
                      ).map((item, index) => (
                        <span key={index}>{index === 3 ? <strong>{item}</strong> : item}</span>
                      ))}
                    </span>
                  </span>
                </CalloutText>
              </Callout>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={onAccept} className="w-full">
                {t($ => $.continueButton)}
              </Button>
              {isFirstVisit && <span className="flex items-center text-sm">{t($ => $.reviewInfo)}</span>}
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="flex items-center text-sm">
                  {t($ => $.version, {
                    version: VERSION_INFO.version
                  })}
                </span>
                <div className="flex items-center justify-center gap-2">
                  <GitHubIcon width="14" height="14" />
                  <a
                    className="text-sm"
                    href="https://github.com/wheerd/strawbuild-studio"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.viewOnGitHub)}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
