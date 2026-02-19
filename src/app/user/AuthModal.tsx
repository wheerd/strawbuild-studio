import { User } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ForgotPasswordForm, SignInForm, SignUpForm } from './forms'
import type { AuthView } from './types'

export interface AuthModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentTab: AuthView
  onTabChange: (tab: AuthView) => void
}

export function AuthModal({ isOpen, onOpenChange, currentTab, onTabChange }: AuthModalProps): React.JSX.Element {
  const { t } = useTranslation('common')

  const handleOpenChange = (open: boolean): void => {
    onOpenChange(open)
  }

  const handleTabChange = (newTab: string): void => {
    onTabChange(newTab as AuthView)
  }

  const handleForgotPasswordClick = (): void => {
    onTabChange('forgot-password')
  }

  const handleBackToSignIn = (): void => {
    onTabChange('sign-in')
  }

  const handleSignInSuccess = (): void => {
    onOpenChange(false)
    toast.success(
      t($ => $.auth.signInSuccess),
      { id: 'auth-success' }
    )
  }

  const handleSignUpSuccess = (_message: string): void => {
    // Form handles its own success message display
  }

  const handleForgotPasswordSuccess = (_message: string): void => {
    // Form handles its own success message display
  }

  const tabValue = currentTab === 'forgot-password' ? 'sign-in' : currentTab

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <div className="mb-4 flex items-center justify-center">
          <div className="bg-primary/10 rounded-full p-3">
            <User className="text-primary h-10 w-10" />
          </div>
        </div>

        {currentTab === 'forgot-password' ? (
          <>
            <DialogTitle className="sr-only">{t($ => $.auth.forgotPassword)}</DialogTitle>
            <ForgotPasswordForm onSuccess={handleForgotPasswordSuccess} onBackToSignIn={handleBackToSignIn} />
          </>
        ) : (
          <Tabs value={tabValue} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign-in">{t($ => $.auth.signIn)}</TabsTrigger>
              <TabsTrigger value="sign-up">{t($ => $.auth.signUp)}</TabsTrigger>
            </TabsList>

            <TabsContent value="sign-in" className="mt-4">
              <DialogTitle className="sr-only">{t($ => $.auth.signIn)}</DialogTitle>
              <SignInForm onSuccess={handleSignInSuccess} onForgotPasswordClick={handleForgotPasswordClick} />
            </TabsContent>

            <TabsContent value="sign-up" className="mt-4">
              <DialogTitle className="sr-only">{t($ => $.auth.signUp)}</DialogTitle>
              <SignUpForm onSuccess={handleSignUpSuccess} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
