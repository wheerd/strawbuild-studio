import { MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { useTheme } from 'next-themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function ThemeToggle(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      className="h-7 w-7"
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark')
      }}
      title={isDark ? t($ => $.themeToggle.switchToLight) : t($ => $.themeToggle.switchToDark)}
      aria-pressed={isDark}
    >
      {isDark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
    </Button>
  )
}
