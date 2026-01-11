import { GlobeIcon } from '@radix-ui/react-icons'
import { DropdownMenu, IconButton } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

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
export function LanguageSwitcher(): React.JSX.Element {
  const { i18n, t } = useTranslation('common')

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) ?? LANGUAGES[0]

  const changeLanguage = (languageCode: string) => {
    void i18n.changeLanguage(languageCode)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          variant="soft"
          size="1"
          title={t($ => $.currentLanguageWithLabel, {
            language: currentLanguage.name,
            defaultValue: 'Current language: {{language}}'
          })}
          aria-label={t($ => $.app.changeLanguage)}
        >
          <GlobeIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.RadioGroup
          value={i18n.language}
          onValueChange={value => {
            changeLanguage(value)
          }}
        >
          {LANGUAGES.map(lang => (
            <DropdownMenu.RadioItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
