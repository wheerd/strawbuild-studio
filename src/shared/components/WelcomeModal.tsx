import { Cross2Icon, ExclamationTriangleIcon, GitHubLogoIcon } from '@radix-ui/react-icons'
import { Button, Callout, Dialog, Flex, Grid, Heading, IconButton, Link, Text } from '@radix-ui/themes'
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
        <Flex direction="column" gap="4">
          <Dialog.Title>
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <Logo />
              </Flex>
              <Flex gap="2" align="center">
                <LanguageSwitcher />
                {!isFirstVisit && (
                  <Dialog.Close>
                    <IconButton variant="ghost" highContrast>
                      <Cross2Icon />
                    </IconButton>
                  </Dialog.Close>
                )}
              </Flex>
            </Flex>
          </Dialog.Title>

          <Flex direction="column" mt="-2" p="0" gap="3">
            <Text>{t($ => $.introduction)}</Text>

            <Grid columns="1fr 1fr" gap="4">
              <Flex direction="column" gap="2">
                <Heading size="3">{t($ => $.keyFeatures.title)}</Heading>
                <Text as="div" size="1">
                  <ul style={{ listStyleType: 'disc', margin: 0, paddingLeft: '1.5rem' }}>
                    {(
                      t($ => $.keyFeatures.items, {
                        returnObjects: true
                      }) as string[]
                    ).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </Text>
              </Flex>

              <Flex direction="column" gap="2">
                <Heading size="3">{t($ => $.plannedFeatures.title)}</Heading>
                <Text as="div" size="1">
                  <ul style={{ listStyleType: 'disc', margin: 0, paddingLeft: '1.5rem' }}>
                    {(
                      t($ => $.plannedFeatures.items, {
                        returnObjects: true
                      }) as string[]
                    ).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </Text>
              </Flex>
            </Grid>

            <Grid columns="1fr 1fr" gap="4">
              <Flex direction="column" gap="2">
                <Heading size="3">{t($ => $.demoVideo.title)}</Heading>
                <Text size="2">{t($ => $.demoVideo.description)}</Text>
                <Flex direction="row" gap="4" align="center">
                  <Link
                    size="2"
                    weight="bold"
                    href="https://www.youtube.com/watch?v=oe9VnhEW0JE"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.demoVideo.demo01)}
                  </Link>
                  <Link
                    size="2"
                    weight="bold"
                    href="https://www.youtube.com/watch?v=7Ed09YNGSn8"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.demoVideo.demo02)}
                  </Link>
                </Flex>
                <Heading size="3">{t($ => $.localStorage.title)}</Heading>
                <Text as="div" size="1">
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
                </Text>
                <Text size="2" color="gray">
                  {t($ => $.localStorage.privacy)}
                </Text>
              </Flex>

              <Callout.Root color="orange" variant="surface">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Flex direction="column" gap="2" as="span">
                    <Text weight="bold">{t($ => $.disclaimer.title)}</Text>
                    <Text>{t($ => $.disclaimer.intro)}</Text>
                    <Flex direction="column" ml="4" gap="0" as="span">
                      {(
                        t($ => $.disclaimer.items, {
                          returnObjects: true
                        }) as string[]
                      ).map((item, index) => (
                        <Text key={index}>{index === 3 ? <strong>{item}</strong> : item}</Text>
                      ))}
                    </Flex>
                  </Flex>
                </Callout.Text>
              </Callout.Root>
            </Grid>

            <Flex direction="column" gap="2" align="center">
              <Button size="3" onClick={onAccept} style={{ width: '100%' }}>
                {t($ => $.continueButton)}
              </Button>
              {isFirstVisit && (
                <Text size="1" color="gray" align="center">
                  {t($ => $.reviewInfo)}
                </Text>
              )}
              <Flex direction="column" gap="1" align="center" style={{ marginTop: 'var(--space-2)' }}>
                <Text size="1" color="gray" align="center">
                  {t($ => $.version, {
                    version: VERSION_INFO.version
                  })}
                </Text>
                <Flex gap="2" align="center" justify="center">
                  <GitHubLogoIcon width="14" height="14" />
                  <Link
                    size="1"
                    href="https://github.com/wheerd/strawbaler-online"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t($ => $.viewOnGitHub)}
                  </Link>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
