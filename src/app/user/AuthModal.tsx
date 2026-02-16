import { PersonIcon } from '@radix-ui/react-icons'
import type { AuthError } from '@supabase/supabase-js'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import type { AuthView } from './types'

export interface AuthModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ isOpen, onOpenChange }: AuthModalProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [view, setView] = useState<AuthView>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const resetForm = (): void => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccessMessage(null)
  }

  const handleViewChange = (newView: string): void => {
    setView(newView as AuthView)
    resetForm()
  }

  const getErrorMessage = (authError: AuthError): string => {
    const errorCode = authError.code

    switch (errorCode) {
      case 'invalid_credentials':
        return t($ => $.auth.errors.invalidCredentials)
      case 'weak_password':
        return t($ => $.auth.errors.weakPassword)
      case 'email_not_confirmed':
        return t($ => $.auth.errors.emailNotConfirmed)
      case 'user_already_exists':
      case 'duplicate':
        return t($ => $.auth.errors.emailAlreadyExists)
      default:
        return t($ => $.auth.errors.generic)
    }
  }

  const handleSignIn = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()

    setIsLoading(true)
    setError(null)

    void (async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError(getErrorMessage(error))
        setIsLoading(false)
      } else {
        onOpenChange(false)
        resetForm()
      }
    })()
  }

  const handleSignUp = (e: React.SyntheticEvent<HTMLFormElement>): void => {
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
      const { error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        setError(getErrorMessage(error))
        setIsLoading(false)
      } else {
        setSuccessMessage(t($ => $.auth.checkEmailToConfirm))
        setIsLoading(false)
      }
    })()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <div className="mb-4 flex items-center justify-center">
          <div className="bg-primary/10 rounded-full p-3">
            <PersonIcon className="text-primary h-6 w-6" />
          </div>
        </div>

        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">{t($ => $.auth.signIn)}</TabsTrigger>
            <TabsTrigger value="sign-up">{t($ => $.auth.signUp)}</TabsTrigger>
          </TabsList>

          <TabsContent value="sign-in" className="mt-4">
            <DialogTitle className="sr-only">{t($ => $.auth.signIn)}</DialogTitle>
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
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
            </form>
          </TabsContent>

          <TabsContent value="sign-up" className="mt-4">
            <DialogTitle className="sr-only">{t($ => $.auth.signUp)}</DialogTitle>
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}
              {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? t($ => $.auth.creatingAccount) : t($ => $.auth.createAccount)}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
