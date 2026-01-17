import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Callout, Code, Flex, Heading, Text } from '@radix-ui/themes'
import { useState } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { hardReset } from '@/shared/utils/hardReset'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  const { t } = useTranslation('errors')
  const [showDetails, setShowDetails] = useState(false)

  const message = error instanceof Error ? error.message : t($ => $.boundary.errorMessage)
  const stack = error instanceof Error ? error.stack : t($ => $.boundary.noStackTrace)

  const handleCopyError = () => {
    const errorText = `Error: ${message}\n\nStack:\n${stack}`
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
          <Heading size="6">{t($ => $.boundary.title)}</Heading>
          <Text color="gray" align="center">
            {t($ => $.boundary.description)}
          </Text>
        </Flex>

        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>{message}</strong>
          </Callout.Text>
        </Callout.Root>

        {showDetails && stack && (
          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              {t($ => $.boundary.errorDetails)}
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
              {stack}
            </Code>
          </Flex>
        )}

        <Flex direction="column" gap="2">
          <Button
            size="3"
            onClick={() => {
              window.location.reload()
            }}
          >
            <ReloadIcon />
            {t($ => $.boundary.reloadPage)}
          </Button>

          <Button size="3" variant="soft" onClick={resetErrorBoundary}>
            {t($ => $.boundary.tryAgain)}
          </Button>

          <Button
            size="2"
            variant="outline"
            onClick={() => {
              setShowDetails(!showDetails)
            }}
          >
            {showDetails ? t($ => $.boundary.hideDetails) : t($ => $.boundary.showDetails)}
          </Button>

          <Button size="2" variant="ghost" onClick={handleCopyError}>
            {t($ => $.boundary.copyError)}
          </Button>
        </Flex>

        <Callout.Root color="orange" variant="surface">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex direction="column" gap="2">
              <Text weight="bold">{t($ => $.boundary.dataRecovery.title)}</Text>
              <Text size="2">{t($ => $.boundary.dataRecovery.description)}</Text>
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button size="2" color="orange" variant="soft">
                    {t($ => $.boundary.dataRecovery.hardReset)}
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Title>{t($ => $.boundary.dataRecovery.dialogTitle)}</AlertDialog.Title>
                  <AlertDialog.Description>{t($ => $.boundary.dataRecovery.dialogDescription)}</AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">
                        {t($ => $.boundary.dataRecovery.cancel)}
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={hardReset}>
                        {t($ => $.boundary.dataRecovery.confirm)}
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
