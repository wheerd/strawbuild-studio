import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import type { FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'

export function ModalErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  const { t } = useTranslation('errors')
  console.error(error)

  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 p-4">
      <Callout className="text-destructive w-full">
        <CalloutIcon>
          <ExclamationTriangleIcon />
        </CalloutIcon>
        <CalloutText>
          <span className="text-sm">
            {t($ => $.modal.errorPrefix)} {error instanceof Error ? error.message : t($ => $.modal.defaultMessage)}
          </span>
        </CalloutText>
      </Callout>

      <Button size="sm" onClick={resetErrorBoundary}>
        <ReloadIcon />
        {t($ => $.modal.retry)}
      </Button>
    </div>
  )
}
