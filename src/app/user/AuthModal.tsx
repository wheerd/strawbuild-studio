import { ArrowLeftIcon, PersonIcon } from '@radix-ui/react-icons'
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
  currentTab: AuthView
  onTabChange: (tab: AuthView) => void
}

export function AuthModal({ isOpen, onOpenChange, currentTab, onTabChange }: AuthModalProps): React.JSX.Element {
  const { t } = useTranslation('common')
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

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const handleTabChange = (newTab: string): void => {
    resetForm()
    onTabChange(newTab as AuthView)
  }

  const handleForgotPasswordClick = (): void => {
    resetForm()
    onTabChange('forgot-password')
  }

  const handleBackToSignIn = (): void => {
    resetForm()
    onTabChange('sign-in')
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
        handleOpenChange(false)
      }
    })()
  }

  const handleSignUp = async (e: React.SubmitEvent): Promise<void> => {
    e.preventDefault()
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()

    if (password !== confirmPassword) {
      setError(t($ => $.auth.passwordsDoNotMatch))
      return
    }

    setIsLoading(true)
    setError(null)

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
  }

  const handleForgotPassword = async (e: React.SubmitEvent): Promise<void> => {
    e.preventDefault()
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()

    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    })

    if (error) {
      setError(getErrorMessage(error))
      setIsLoading(false)
    } else {
      setSuccessMessage(t($ => $.auth.resetEmailSent))
      setIsLoading(false)
    }
  }

  const tabValue = currentTab === 'forgot-password' ? 'sign-in' : currentTab

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <div className="mb-4 flex items-center justify-center">
          <div className="bg-primary/10 rounded-full p-3">
            <PersonIcon className="text-primary h-6 w-6" />
          </div>
        </div>

        {currentTab === 'forgot-password' ? (
          <>
            <DialogTitle className="sr-only">{t($ => $.auth.forgotPassword)}</DialogTitle>

            {successMessage ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-green-600">{successMessage}</p>
                <Button variant="outline" onClick={handleBackToSignIn} className="w-full">
                  {t($ => $.auth.backToSignIn)}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 text-center">
                  <h2 className="text-lg font-semibold">{t($ => $.auth.forgotPassword)}</h2>
                  <p className="text-muted-foreground text-sm">{t($ => $.auth.forgotPasswordDescription)}</p>
                </div>

                <form onSubmit={e => void handleForgotPassword(e)} className="flex flex-col gap-4">
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

                  <Button variant="ghost" onClick={handleBackToSignIn} className="w-full">
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    {t($ => $.auth.backToSignIn)}
                  </Button>
                </form>
              </>
            )}
          </>
        ) : (
          <Tabs value={tabValue} onValueChange={handleTabChange}>
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

                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="text-muted-foreground text-center text-sm hover:underline"
                >
                  {t($ => $.auth.forgotPasswordLink)}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="sign-up" className="mt-4">
              <DialogTitle className="sr-only">{t($ => $.auth.signUp)}</DialogTitle>
              <form onSubmit={e => void handleSignUp(e)} className="flex flex-col gap-4">
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
        )}
      </DialogContent>
    </Dialog>
  )
}
