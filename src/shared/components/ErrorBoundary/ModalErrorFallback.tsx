import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { Button, Callout, Flex, Text } from '@radix-ui/themes'
import type { FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

export function ModalErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  const { t } = useTranslation('errors')

  return (
    <Flex direction="column" align="center" justify="center" gap="3" p="4" minHeight="150px">
      <Callout.Root color="red" style={{ width: '100%' }}>
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="2">
            {t($ => $.modal.errorPrefix)} {error instanceof Error ? error.message : t($ => $.modal.defaultMessage)}
          </Text>
        </Callout.Text>
      </Callout.Root>

      <Button size="2" onClick={resetErrorBoundary}>
        <ReloadIcon />
        {t($ => $.modal.retry)}
      </Button>
    </Flex>
  )
}
