import { MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'
import { useTheme } from 'next-themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

export function ThemeToggle(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <IconButton
      variant="soft"
      size="1"
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark')
      }}
      title={isDark ? t($ => $.themeToggle.switchToLight) : t($ => $.themeToggle.switchToDark)}
      aria-pressed={isDark}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  )
}
