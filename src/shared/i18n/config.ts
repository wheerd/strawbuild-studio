import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import commonDE from './locales/de/common.json'
// Import translation files
import commonEN from './locales/en/common.json'

const resources = {
  en: {
    common: commonEN
  },
  de: {
    common: commonDE
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],

    interpolation: {
      escapeValue: false // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    // Enable debug mode in development
    debug: import.meta.env.DEV
  })

export default i18n
