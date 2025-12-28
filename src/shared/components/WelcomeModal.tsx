import { Cross2Icon, ExclamationTriangleIcon, GitHubLogoIcon } from '@radix-ui/react-icons'
import { Button, Callout, Dialog, Flex, Grid, Heading, IconButton, Link, Text } from '@radix-ui/themes'
import React from 'react'

import { VERSION_INFO } from '@/shared/utils/version'

import { Logo } from './Logo'

export type OpenMode = 'first-visit' | 'manual'

export interface WelcomeModalProps {
  isOpen: boolean
  mode: OpenMode
  onAccept: () => void
  trigger?: React.ReactNode
}

export function WelcomeModal({ isOpen, mode, onAccept, trigger }: WelcomeModalProps): React.JSX.Element {
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
              {!isFirstVisit && (
                <Dialog.Close>
                  <IconButton variant="ghost" highContrast>
                    <Cross2Icon />
                  </IconButton>
                </Dialog.Close>
              )}
            </Flex>
          </Dialog.Title>

          <Flex direction="column" mt="-2" p="0" gap="3">
            <Text>
              This is a tool specifically designed for strawbale construction planning. Create floor plans with walls,
              openings, roof and floors. Configure the construction and generate plans and 3D models. Get estimates for
              required materials. Export construction for use in other CAD tools.
            </Text>

            <Grid columns="1fr 1fr" gap="4">
              <Flex direction="column" gap="2">
                <Heading size="3">Key Features</Heading>
                <Text as="div" size="1">
                  <ul style={{ listStyleType: 'disc', margin: 0, paddingLeft: '1.5rem' }}>
                    <li>Define perimeter walls in finished dimensions (with plasters) with windows and doors</li>
                    <li>Add gable or shed roofs</li>
                    <li>Configure your wall, floor and roof assembly (infill, strawhenge, modules)</li>
                    <li>Generate 2D construction plans for invdividual walls or whole floors</li>
                    <li>View and export 3D models of the construction (IFC)</li>
                    <li>Get an overview of materials used in the construction</li>
                  </ul>
                </Text>
              </Flex>

              <Flex direction="column" gap="2">
                <Heading size="3">Planned Features</Heading>
                <Text as="div" size="1">
                  <ul style={{ listStyleType: 'disc', margin: 0, paddingLeft: '1.5rem' }}>
                    <li>Cost and work hours estimations</li>
                    <li>Support for intermediate walls and foundations</li>
                    <li>Translation in more languages</li>
                    <li>Support for more irregular building shapes</li>
                    <li>Support for multiple projects</li>
                  </ul>
                </Text>
              </Flex>
            </Grid>

            <Grid columns="1fr 1fr" gap="4">
              <Flex direction="column" gap="2">
                <Heading size="3">Demo Video</Heading>
                <Text size="2">Watch a quick demonstration of Strawbaler&apos;s features on YouTube:</Text>
                <Flex direction="row" gap="4" align="center">
                  <Link
                    size="2"
                    weight="bold"
                    href="https://www.youtube.com/watch?v=oe9VnhEW0JE"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Demo 0.1
                  </Link>
                  <Link
                    size="2"
                    weight="bold"
                    href="https://www.youtube.com/watch?v=7Ed09YNGSn8"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Demo 0.2
                  </Link>
                </Flex>
                <Heading size="3">Local Storage</Heading>
                <Text as="div" size="1">
                  This application stores data locally in your browser to:
                  <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                    <li>Remember that you&apos;ve seen this welcome message</li>
                    <li>Save your floor plans and projects</li>
                    <li>Preserve your configuration preferences</li>
                  </ul>
                </Text>
                <Text size="2" color="gray">
                  No cookies, tracking, or third-party analytics are used.
                </Text>
              </Flex>

              <Callout.Root color="orange" variant="surface">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Flex direction="column" gap="2" as="span">
                    <Text weight="bold">Important Disclaimer</Text>
                    <Text>This tool is currently in active development and provided as-is:</Text>
                    <Flex direction="column" ml="4" gap="0" as="span">
                      <Text>No guarantees for accuracy of calculations, plans, or 3D models</Text>
                      <Text>Breaking changes may occur between versions</Text>
                      <Text>Project data may be lost due to browser storage limitations or updates</Text>
                      <Text>
                        <strong>Always save and export your work regularly</strong>
                      </Text>
                      <Text>This tool does not replace professional engineering consultation</Text>
                    </Flex>
                  </Flex>
                </Callout.Text>
              </Callout.Root>
            </Grid>

            <Flex direction="column" gap="2" align="center">
              <Button size="3" onClick={onAccept} style={{ width: '100%' }}>
                I Understand &amp; Continue
              </Button>
              {isFirstVisit && (
                <Text size="1" color="gray" align="center">
                  You can review this information anytime via the info icon in the toolbar
                </Text>
              )}
              <Flex direction="column" gap="1" align="center" style={{ marginTop: 'var(--space-2)' }}>
                <Text size="1" color="gray" align="center">
                  Version {VERSION_INFO.version}
                </Text>
                <Flex gap="2" align="center" justify="center">
                  <GitHubLogoIcon width="14" height="14" />
                  <Link
                    size="1"
                    href="https://github.com/wheerd/strawbaler-online"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
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
