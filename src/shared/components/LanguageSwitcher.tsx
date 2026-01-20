import { GlobeIcon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface Language {
  code: string
  name: string
  flag: string
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
]

/**
 * Language switcher component that allows users to change the application language.
 *
 * Displays a globe icon that opens a dropdown menu with available languages.
 * The selected language is persisted to localStorage via i18next.
 *
 * Currently supports:
 * - English (en)
 * - German (de)
 */
export function LanguageSwitcher({ size }: { size: 'sm' | 'lg' }): React.JSX.Element {
  const { i18n, t } = useTranslation('common')

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) ?? LANGUAGES[0]

  const changeLanguage = (languageCode: string) => {
    void i18n.changeLanguage(languageCode)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size={size === 'sm' ? 'icon-sm' : 'icon'}
          className={size === 'sm' ? 'h-7 w-7' : 'h-10 w-10'}
          title={t($ => $.currentLanguageWithLabel, {
            language: currentLanguage.name,
            defaultValue: 'Current language: {{language}}'
          })}
          aria-label={t($ => $.app.changeLanguage)}
        >
          <GlobeIcon
            className={size === 'sm' ? undefined : 'h-9! w-9!'}
            width={size === 'sm' ? '14' : '30'}
            height={size === 'sm' ? '14' : '30'}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={i18n.language}
          onValueChange={value => {
            changeLanguage(value)
          }}
        >
          {LANGUAGES.map(lang => (
            <DropdownMenuRadioItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
