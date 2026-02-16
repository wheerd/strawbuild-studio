import { ExitIcon, PersonIcon } from '@radix-ui/react-icons'
import * as React from 'react'
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

import { useUserEmail } from './store'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

export interface UserMenuProps {
  trigger?: React.ReactNode
}

export function UserMenu({ trigger }: UserMenuProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const email = useUserEmail()

  const handleSignOut = (): void => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()
      void supabase.auth.signOut()
    }
  }

  const defaultTrigger = (
    <Button variant="ghost" size="icon-sm">
      <PersonIcon className="h-4 w-4" />
    </Button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger ?? defaultTrigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuLabel className="max-w-[200px] truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <ExitIcon className="mr-2 h-4 w-4" />
          {t($ => $.auth.signOut)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
