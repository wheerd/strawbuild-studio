import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getAuthErrorMessage } from '@/app/user/authErrors'
import { getSupabaseClient, isSupabaseConfigured } from '@/app/user/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface SignInFormProps {
  onSuccess: () => void
  onForgotPasswordClick: () => void
}

export function SignInForm({ onSuccess, onForgotPasswordClick }: SignInFormProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()

    setIsLoading(true)
    setError(null)

    void (async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(getAuthErrorMessage(error, t))
        setIsLoading(false)
      } else {
        onSuccess()
      }
    })()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="sign-in-email" className="text-sm font-medium">
          {t($ => $.auth.email)}
        </label>
        <Input
          id="sign-in-email"
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

      <div className="flex flex-col gap-2">
        <label htmlFor="sign-in-password" className="text-sm font-medium">
          {t($ => $.auth.password)}
        </label>
        <Input
          id="sign-in-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => {
            setPassword(e.target.value)
          }}
          required
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? t($ => $.auth.signingIn) : t($ => $.auth.signIn)}
      </Button>

      <button
        type="button"
        onClick={onForgotPasswordClick}
        className="text-muted-foreground text-center text-sm hover:underline"
      >
        {t($ => $.auth.forgotPasswordLink)}
      </button>
    </form>
  )
}
