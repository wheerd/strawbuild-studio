import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { Button, Callout, Flex, Text } from '@radix-ui/themes'
import type { FallbackProps } from 'react-error-boundary'

export function ModalErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  return (
    <Flex direction="column" align="center" justify="center" gap="3" p="4" minHeight="150px">
      <Callout.Root color="red" style={{ width: '100%' }}>
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="2">Error: {error.message || 'This content could not be displayed due to an error.'}</Text>
        </Callout.Text>
      </Callout.Root>

      {resetErrorBoundary && (
        <Button size="2" onClick={resetErrorBoundary}>
          <ReloadIcon />
          Retry
        </Button>
      )}
    </Flex>
  )
}
