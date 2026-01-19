import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import type { FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { hardReset } from '@/shared/utils/hardReset'

export function FeatureErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  const { t } = useTranslation('errors')

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 min-h-[200px]">
      <Callout className="text-destructive" className="w-full max-w-[500px]">
        <CalloutIcon>
          <ExclamationTriangleIcon />
        </CalloutIcon>
        <CalloutText>
          <span className="flex flex-col gap-2">
            <span className="font-bold">{t($ => $.feature.title)}</span>
            <span className="text-sm">{error instanceof Error ? error.message : t($ => $.feature.defaultMessage)}</span>
          </span>
        </CalloutText>
      </Callout>

      <div className="flex gap-2 w-full max-w-[500px]">
        <Button className="flex flex-1" onClick={resetErrorBoundary}>
          <ReloadIcon className="mr-2" />
          {t($ => $.feature.retry)}
        </Button>

        <Button
          variant="secondary"
          className="flex flex-1"
          onClick={() => {
            window.location.reload()
          }}
        >
          {t($ => $.feature.reloadPage)}
        </Button>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-orange-600 dark:text-orange-400">
            {t($ => $.feature.hardReset)}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>{t($ => $.feature.dialogTitle)}</AlertDialogTitle>
          <AlertDialogDescription>{t($ => $.feature.dialogDescription)}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t($ => $.feature.cancel)}</AlertDialogCancel>
            <AlertDialogAction onClick={hardReset} className="bg-red-600 hover:bg-red-700">
              {t($ => $.feature.confirm)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
