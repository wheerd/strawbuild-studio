import { EnterIcon, ExitIcon, PersonIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { AuthModal } from './AuthModal'
import { useIsAuthenticated, useUserEmail } from './store'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

export function UserMenu(): React.JSX.Element {
  const { t } = useTranslation('common')
  const email = useUserEmail()
  const isAuthenticated = useIsAuthenticated()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const handleSignOut = (): void => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()
      void supabase.auth.signOut()
    }
  }

  const handleSignIn = (): void => {
    setIsAuthModalOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full">
            <PersonIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          {isAuthenticated ? (
            <>
              <DropdownMenuLabel className="max-w-[200px] truncate">{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <ExitIcon className="mr-2 h-4 w-4" />
                {t($ => $.auth.signOut)}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleSignIn} className="cursor-pointer">
              <EnterIcon className="mr-2 h-4 w-4" />
              {t($ => $.auth.signIn)}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </>
  )
}
