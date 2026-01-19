import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import type { FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'

export function ModalErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  const { t } = useTranslation('errors')

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 min-h-[150px]">
      <Callout color="red" className="w-full">
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
