import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Callout, Code, Flex, Heading, Text } from '@radix-ui/themes'
import { useState } from 'react'
import type { FallbackProps } from 'react-error-boundary'

import { hardReset } from '@/shared/utils/hardReset'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  const [showDetails, setShowDetails] = useState(false)

  const handleCopyError = () => {
    const errorText = `Error: ${error.message}\n\nStack:\n${error.stack || 'No stack trace available'}`
    navigator.clipboard.writeText(errorText).catch(console.error)
  }

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--gray-2)'
      }}
    >
      <Flex direction="column" gap="4" style={{ maxWidth: '600px', width: '100%' }}>
        <Flex direction="column" gap="2" align="center">
          <ExclamationTriangleIcon width="48" height="48" color="var(--red-9)" />
          <Heading size="6">Something went wrong</Heading>
          <Text color="gray" align="center">
            The application encountered an unexpected error and cannot continue.
          </Text>
        </Flex>

        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>{error.message || 'An unexpected error occurred'}</strong>
          </Callout.Text>
        </Callout.Root>

        {showDetails && error.stack && (
          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              Error Details:
            </Text>
            <Code
              style={{
                display: 'block',
                padding: 'var(--space-3)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflow: 'auto'
              }}
            >
              {error.stack}
            </Code>
          </Flex>
        )}

        <Flex direction="column" gap="2">
          <Button size="3" onClick={() => window.location.reload()}>
            <ReloadIcon />
            Reload Page
          </Button>

          {resetErrorBoundary && (
            <Button size="3" variant="soft" onClick={resetErrorBoundary}>
              Try Again
            </Button>
          )}

          <Button size="2" variant="outline" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>

          <Button size="2" variant="ghost" onClick={handleCopyError}>
            Copy Error Details
          </Button>
        </Flex>

        <Callout.Root color="orange" variant="surface">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex direction="column" gap="2">
              <Text weight="bold">Data Recovery Option</Text>
              <Text size="2">
                If the error persists, you can perform a hard reset that will clear all stored data and reset the
                application to its default state. This will delete your floor plans and configurations.
              </Text>
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button size="2" color="orange" variant="soft">
                    Hard Reset Application
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Title>Reset Application?</AlertDialog.Title>
                  <AlertDialog.Description>
                    This will delete all your data including floor plans, configurations, and materials. This action
                    cannot be undone.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={hardReset}>
                        Delete All Data & Reset
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      </Flex>
    </Flex>
  )
}
