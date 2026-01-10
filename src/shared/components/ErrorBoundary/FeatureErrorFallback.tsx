import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Callout, Flex, Text } from '@radix-ui/themes'
import type { FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { hardReset } from '@/shared/utils/hardReset'

export function FeatureErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  const { t } = useTranslation('errors')

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
          <Flex as="span" direction="column" gap="2">
            <Text weight="bold">{t($ => $.feature.title)}</Text>
            <Text size="2">{error.message || t($ => $.feature.defaultMessage)}</Text>
          </Flex>
        </Callout.Text>
      </Callout.Root>

      <Flex gap="2" style={{ width: '100%', maxWidth: '500px' }}>
        {resetErrorBoundary && (
          <Button size="2" onClick={resetErrorBoundary} style={{ flex: 1 }}>
            <ReloadIcon />
            {t($ => $.feature.retry)}
          </Button>
        )}
        <Button size="2" variant="soft" onClick={() => window.location.reload()} style={{ flex: 1 }}>
          {t($ => $.feature.reloadPage)}
        </Button>
      </Flex>

      <AlertDialog.Root>
        <AlertDialog.Trigger>
          <Button size="1" variant="ghost" color="orange">
            {t($ => $.feature.hardReset)}
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Title>{t($ => $.feature.dialogTitle)}</AlertDialog.Title>
          <AlertDialog.Description>{t($ => $.feature.dialogDescription)}</AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                {t($ => $.feature.cancel)}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={hardReset}>
                {t($ => $.feature.confirm)}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  )
}
