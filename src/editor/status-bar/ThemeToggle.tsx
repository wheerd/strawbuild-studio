import { MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'
import { useTheme } from 'next-themes'
import React from 'react'

export function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <IconButton
      variant="soft"
      size="1"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  )
}
