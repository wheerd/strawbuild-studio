import { EnterIcon, ExitIcon, PersonIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { getAuthErrorMessage } from '@/app/user/authErrors'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { useIsAuthenticated, useUserEmail } from './store'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

export function UserMenu(): React.JSX.Element {
  const { t } = useTranslation('common')
  const email = useUserEmail()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async (): Promise<void> => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()
      const result = await supabase.auth.signOut()
      if (result.error) {
        toast.error(getAuthErrorMessage(result.error, t), { id: 'auth-error' })
      } else {
        toast.success(
          t($ => $.auth.signOutSuccess),
          { id: 'auth-error' }
        )
      }
    }
  }

  const handleChangePassword = (): void => {
    void navigate('/auth/update-password', {
      state: { backgroundLocation: location }
    })
  }

  const handleSignIn = (): void => {
    void navigate('/auth/sign-in', {
      state: { backgroundLocation: location }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full" title={t($ => $.auth.accountMenu)}>
          <PersonIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        {isAuthenticated ? (
          <>
            <DropdownMenuLabel className="max-w-[200px] truncate" data-testid="user-email">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleChangePassword} className="cursor-pointer">
              {t($ => $.auth.updatePassword)}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleSignOut()} className="cursor-pointer">
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
  )
}
