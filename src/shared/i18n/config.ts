import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import {
  formatArea,
  formatDimensions2D,
  formatLength,
  formatLengthInMeters,
  formatVolume,
  formatWeight
} from './formatters'
import commonDE from './locales/de/common.json'
import inspectorDE from './locales/de/inspector.json'
import toolbarDE from './locales/de/toolbar.json'
import welcomeDE from './locales/de/welcome.json'
// Import translation files
import commonEN from './locales/en/common.json'
import inspectorEN from './locales/en/inspector.json'
import toolbarEN from './locales/en/toolbar.json'
import welcomeEN from './locales/en/welcome.json'

const resources = {
  en: {
    common: commonEN,
    welcome: welcomeEN,
    toolbar: toolbarEN,
    inspector: inspectorEN
  },
  de: {
    common: commonDE,
    welcome: welcomeDE,
    toolbar: toolbarDE,
    inspector: inspectorDE
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'welcome', 'toolbar', 'inspector'],

    interpolation: {
      escapeValue: false, // React already escapes
      // Register custom formatters for use in translations
      format: (value: unknown, format: string | undefined, lng: string | undefined) => {
        const locale = lng || 'en'

        if (typeof value !== 'number' && !Array.isArray(value)) {
          return String(value)
        }

        switch (format) {
          case 'length':
            return formatLength(value as number, locale)
          case 'lengthInMeters':
            return formatLengthInMeters(value as number, locale)
          case 'area':
            return formatArea(value as number, locale)
          case 'volume':
            return formatVolume(value as number, locale)
          case 'weight':
            return formatWeight(value as number, locale)
          case 'dimensions2D': {
            // For cross-sections like "50mm × 100mm"
            // Expects value to be array [width, height]
            if (Array.isArray(value) && value.length === 2) {
              return formatDimensions2D([value[0], value[1]], true, locale)
            }
            return String(value)
          }
          default:
            return String(value)
        }
      }
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    // Enable debug mode in development, but disable in tests to reduce noise
    debug: import.meta.env.DEV && import.meta.env.MODE !== 'test'
  })

export default i18n
