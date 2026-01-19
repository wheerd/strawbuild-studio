import { Cross2Icon, ExclamationTriangleIcon, GitHubLogoIcon } from '@radix-ui/react-icons'
import { Button, Callout, Dialog, IconButton, Link } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

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
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <Dialog.Trigger>{trigger}</Dialog.Trigger>}
      <Dialog.Content
        aria-describedby={undefined}
        size="3"
        maxWidth="90vw"
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
          <Dialog.Title>
            <div className="justify-between items-center">
              <div className="flex items-center gap-2">
                <Logo />
              </div>
              <div className="gap-2 items-center">
                <LanguageSwitcher />
                {!isFirstVisit && (
                  <Dialog.Close>
                    <IconButton variant="ghost" highContrast>
                      <Cross2Icon />
                    </IconButton>
                  </Dialog.Close>
                )}
              </div>
            </div>
          </Dialog.Title>

          <div className="flex-col mt--2 p-0 gap-3">
            <span>{t($ => $.introduction)}</span>

            <div className="grid-cols-2 gap-4">
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

            <div className="grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <h3>{t($ => $.demoVideo.title)}</h3>
                <span className="text-base">{t($ => $.demoVideo.description)}</span>
                <div className="flex-row gap-4 items-center">
                  <Link
                    size="2"
                    font-bold
                    href="https://www.youtube.com/watch?v=oe9VnhEW0JE"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.demoVideo.demo01)}
                  </Link>
                  <Link
                    size="2"
                    font-bold
                    href="https://www.youtube.com/watch?v=7Ed09YNGSn8"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.demoVideo.demo02)}
                  </Link>
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

              <Callout.Root color="orange" variant="surface">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  <span className="flex-col gap-2">
                    <span className="font-bold">{t($ => $.disclaimer.title)}</span>
                    <span>{t($ => $.disclaimer.intro)}</span>
                    <span className="flex-col ml-4 gap-0">
                      {(
                        t($ => $.disclaimer.items, {
                          returnObjects: true
                        }) as string[]
                      ).map((item, index) => (
                        <span key={index}>{index === 3 ? <strong>{item}</strong> : item}</span>
                      ))}
                    </span>
                  </span>
                </Callout.Text>
              </Callout.Root>
            </div>

            <div className="flex-col gap-2 items-center">
              <Button size="3" onClick={onAccept} style={{ width: '100%' }}>
                {t($ => $.continueButton)}
              </Button>
              {isFirstVisit && <span className="text-sm text-gray-900 items-center">{t($ => $.reviewInfo)}</span>}
              <div className="flex-col gap-1 items-center mt-2">
                <span className="text-sm text-gray-900 items-center">
                  {t($ => $.version, {
                    version: VERSION_INFO.version
                  })}
                </span>
                <div className="gap-2 items-center justify-center">
                  <GitHubLogoIcon width="14" height="14" />
                  <Link
                    size="1"
                    href="https://github.com/wheerd/strawbaler-online"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.viewOnGitHub)}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}
