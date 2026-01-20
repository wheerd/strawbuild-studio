import { Cross2Icon, ExclamationTriangleIcon, GitHubLogoIcon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { VERSION_INFO } from '@/shared/utils/version'

import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'

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
      >
        <div className="flex flex-col gap-4">
          <DialogTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo />
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                {!isFirstVisit && (
                  <DialogClose asChild>
                    <Button variant="ghost">
                      <Cross2Icon />
                    </Button>
                  </DialogClose>
                )}
              </div>
            </div>
          </DialogTitle>

          <div className="mt--2 flex flex-col gap-3 p-0">
            <span>{t($ => $.introduction)}</span>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <h3>{t($ => $.keyFeatures.title)}</h3>
                <div className="text-sm">
                  <ul style={{ listStyleType: 'disc', margin: 0, paddingLeft: '1.5rem' }}>
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
                  <ul style={{ listStyleType: 'disc', margin: 0, paddingLeft: '1.5rem' }}>
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
                  <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                    {(
                      t($ => $.localStorage.items, {
                        returnObjects: true
                      }) as string[]
                    ).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <span className="text-base text-gray-900">{t($ => $.localStorage.privacy)}</span>
              </div>

              <Callout color="orange" variant="soft">
                <CalloutIcon>
                  <ExclamationTriangleIcon />
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
              <Button size="lg" onClick={onAccept} style={{ width: '100%' }}>
                {t($ => $.continueButton)}
              </Button>
              {isFirstVisit && <span className="flex items-center text-sm text-gray-900">{t($ => $.reviewInfo)}</span>}
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="flex items-center text-sm text-gray-900">
                  {t($ => $.version, {
                    version: VERSION_INFO.version
                  })}
                </span>
                <div className="flex items-center justify-center gap-2">
                  <GitHubLogoIcon width="14" height="14" />
                  <a
                    className="text-sm"
                    href="https://github.com/wheerd/strawbaler-online"
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
