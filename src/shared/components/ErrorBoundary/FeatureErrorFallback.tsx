import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Callout, Flex, Text } from '@radix-ui/themes'
import type { FallbackProps } from 'react-error-boundary'

import { hardReset } from '@/shared/utils/hardReset'

export function FeatureErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      style={{
        padding: 'var(--space-4)',
        minHeight: '200px'
      }}
    >
      <Callout.Root color="red" style={{ width: '100%', maxWidth: '500px' }}>
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          <Flex direction="column" gap="2">
            <Text weight="bold">Feature Error</Text>
            <Text size="2">{error.message || 'This feature encountered an error and cannot be displayed.'}</Text>
          </Flex>
        </Callout.Text>
      </Callout.Root>

      <Flex gap="2" style={{ width: '100%', maxWidth: '500px' }}>
        {resetErrorBoundary && (
          <Button size="2" onClick={resetErrorBoundary} style={{ flex: 1 }}>
            <ReloadIcon />
            Retry
          </Button>
        )}
        <Button size="2" variant="soft" onClick={() => window.location.reload()} style={{ flex: 1 }}>
          Reload Page
        </Button>
      </Flex>

      <AlertDialog.Root>
        <AlertDialog.Trigger>
          <Button size="1" variant="ghost" color="orange">
            Hard Reset Application
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Title>Reset Application?</AlertDialog.Title>
          <AlertDialog.Description>
            This will delete all your data including floor plans, configurations, and materials. This action cannot be
            undone.
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
  )
}
