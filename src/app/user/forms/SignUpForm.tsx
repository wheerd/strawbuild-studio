import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getAuthErrorMessage } from '@/app/user/authErrors'
import { getSupabaseClient, isSupabaseConfigured } from '@/app/user/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface SignUpFormProps {
  onSuccess: (message: string) => void
}

export function SignUpForm({ onSuccess }: SignUpFormProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()

    if (password !== confirmPassword) {
      setError(t($ => $.auth.passwordsDoNotMatch))
      return
    }

    setIsLoading(true)
    setError(null)

    void (async () => {
      const { error } = await supabase.auth.signUp({ email, password })

      if (error) {
        setError(getAuthErrorMessage(error, t))
        setIsLoading(false)
      } else {
        const message = t($ => $.auth.checkEmailToConfirm)
        setSuccessMessage(message)
        onSuccess(message)
        setIsLoading(false)
      }
    })()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="sign-up-email" className="text-sm font-medium">
          {t($ => $.auth.email)}
        </label>
        <Input
          id="sign-up-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => {
            setEmail(e.target.value)
          }}
          required
          disabled={isLoading || !!successMessage}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sign-up-password" className="text-sm font-medium">
          {t($ => $.auth.password)}
        </label>
        <Input
          id="sign-up-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => {
            setPassword(e.target.value)
          }}
          required
          minLength={6}
          disabled={isLoading || !!successMessage}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sign-up-confirm" className="text-sm font-medium">
          {t($ => $.auth.confirmPassword)}
        </label>
        <Input
          id="sign-up-confirm"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={e => {
            setConfirmPassword(e.target.value)
          }}
          required
          minLength={6}
          disabled={isLoading || !!successMessage}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

      <Button type="submit" disabled={isLoading || !!successMessage} className="w-full">
        {isLoading ? t($ => $.auth.creatingAccount) : t($ => $.auth.createAccount)}
      </Button>
    </form>
  )
}
