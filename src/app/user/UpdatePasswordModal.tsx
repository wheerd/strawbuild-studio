import { LockClosedIcon } from '@radix-ui/react-icons'
import type { AuthError } from '@supabase/supabase-js'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

export interface UpdatePasswordModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function UpdatePasswordModal({ isOpen, onOpenChange }: UpdatePasswordModalProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetForm = (): void => {
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(false)
  }

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const getErrorMessage = (authError: AuthError): string => {
    const errorCode = authError.code

    switch (errorCode) {
      case 'weak_password':
        return t($ => $.auth.errors.weakPassword)
      default:
        return t($ => $.auth.errors.generic)
    }
  }

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
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(getErrorMessage(error))
        setIsLoading(false)
      } else {
        setSuccess(true)
        setIsLoading(false)
      }
    })()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <div className="mb-4 flex items-center justify-center">
          <div className="bg-primary/10 rounded-full p-3">
            <LockClosedIcon className="text-primary h-6 w-6" />
          </div>
        </div>

        <DialogTitle className="sr-only">{t($ => $.auth.updatePassword)}</DialogTitle>

        {success ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-green-600">{t($ => $.auth.passwordUpdated)}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold">{t($ => $.auth.updatePassword)}</h2>
              <p className="text-muted-foreground text-sm">{t($ => $.auth.updatePasswordDescription)}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="new-password" className="text-sm font-medium">
                  {t($ => $.auth.newPassword)}
                </label>
                <Input
                  id="new-password"
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
                <label htmlFor="confirm-new-password" className="text-sm font-medium">
                  {t($ => $.auth.confirmNewPassword)}
                </label>
                <Input
                  id="confirm-new-password"
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

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? t($ => $.auth.savingPassword) : t($ => $.auth.savePassword)}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
