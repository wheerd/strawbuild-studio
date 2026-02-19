import { ArrowLeft } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getAuthErrorMessage } from '@/app/user/authErrors'
import { getSupabaseClient, isSupabaseConfigured } from '@/app/user/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface ForgotPasswordFormProps {
  onSuccess: (message: string) => void
  onBackToSignIn: () => void
}

export function ForgotPasswordForm({ onSuccess, onBackToSignIn }: ForgotPasswordFormProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()

    setIsLoading(true)
    setError(null)

    void (async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      })

      if (error) {
        setError(getAuthErrorMessage(error, t))
        setIsLoading(false)
      } else {
        const message = t($ => $.auth.resetEmailSent)
        setSuccessMessage(message)
        onSuccess(message)
        setIsLoading(false)
      }
    })()
  }

  if (successMessage) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-green-600">{successMessage}</p>
        <Button variant="outline" onClick={onBackToSignIn} className="w-full">
          {t($ => $.auth.backToSignIn)}
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold">{t($ => $.auth.forgotPassword)}</h2>
        <p className="text-muted-foreground text-sm">{t($ => $.auth.forgotPasswordDescription)}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="forgot-email" className="text-sm font-medium">
            {t($ => $.auth.email)}
          </label>
          <Input
            id="forgot-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
            }}
            required
            disabled={isLoading}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? t($ => $.auth.sendingResetEmail) : t($ => $.auth.sendResetEmail)}
        </Button>

        <Button variant="ghost" onClick={onBackToSignIn} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t($ => $.auth.backToSignIn)}
        </Button>
      </form>
    </>
  )
}
