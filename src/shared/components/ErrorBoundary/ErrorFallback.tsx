import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
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
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-[600px] flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold">{t($ => $.boundary.title)}</h1>
          <p className="text-muted-foreground text-center">{t($ => $.boundary.description)}</p>
        </div>

        <Callout className="text-destructive">
          <CalloutIcon>
            <ExclamationTriangleIcon />
          </CalloutIcon>
          <CalloutText>
            <strong>{message}</strong>
          </CalloutText>
        </Callout>

        {showDetails && stack && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold">{t($ => $.boundary.errorDetails)}</span>
            <code className="bg-muted border-border block max-h-[200px] overflow-auto rounded border p-3 text-xs wrap-break-word whitespace-pre-wrap">
              {stack}
            </code>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => {
              window.location.reload()
            }}
          >
            <ReloadIcon className="mr-2" />
            {t($ => $.boundary.reloadPage)}
          </Button>

          <Button size="lg" variant="secondary" onClick={resetErrorBoundary}>
            {t($ => $.boundary.tryAgain)}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setShowDetails(!showDetails)
            }}
          >
            {showDetails ? t($ => $.boundary.hideDetails) : t($ => $.boundary.showDetails)}
          </Button>

          <Button variant="ghost" onClick={handleCopyError}>
            {t($ => $.boundary.copyError)}
          </Button>
        </div>

        <Callout color="orange">
          <CalloutIcon>
            <ExclamationTriangleIcon />
          </CalloutIcon>
          <CalloutText>
            <div className="flex flex-col gap-2">
              <span className="font-bold">{t($ => $.boundary.dataRecovery.title)}</span>
              <span className="text-sm">{t($ => $.boundary.dataRecovery.description)}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" className="text-orange-600 dark:text-orange-400">
                    {t($ => $.boundary.dataRecovery.hardReset)}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>{t($ => $.boundary.dataRecovery.dialogTitle)}</AlertDialogTitle>
                  <AlertDialogDescription>{t($ => $.boundary.dataRecovery.dialogDescription)}</AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t($ => $.boundary.dataRecovery.cancel)}</AlertDialogCancel>
                    <AlertDialogAction onClick={hardReset} className="bg-red-600 hover:bg-red-700">
                      {t($ => $.boundary.dataRecovery.confirm)}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CalloutText>
        </Callout>
      </div>
    </div>
  )
}
