import i18n, { type PostProcessorModule } from 'i18next'
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
// Import translation files
import commonDE from './locales/de/common.json'
import configDE from './locales/de/config.json'
import constructionDE from './locales/de/construction.json'
import errorsDE from './locales/de/errors.json'
import inspectorDE from './locales/de/inspector.json'
import overlayDE from './locales/de/overlay.json'
import toolDE from './locales/de/tool.json'
import toolbarDE from './locales/de/toolbar.json'
import viewerDE from './locales/de/viewer.json'
import welcomeDE from './locales/de/welcome.json'
import commonEN from './locales/en/common.json'
import configEN from './locales/en/config.json'
import constructionEN from './locales/en/construction.json'
import errorsEN from './locales/en/errors.json'
import inspectorEN from './locales/en/inspector.json'
import overlayEN from './locales/en/overlay.json'
import toolEN from './locales/en/tool.json'
import toolbarEN from './locales/en/toolbar.json'
import viewerEN from './locales/en/viewer.json'
import welcomeEN from './locales/en/welcome.json'

class XPostProcessor implements PostProcessorModule {
  readonly name = 'x'
  readonly type = 'postProcessor'

  process(): string {
    return 'X'
  }
}

const resources = {
  en: {
    common: commonEN,
    welcome: welcomeEN,
    toolbar: toolbarEN,
    inspector: inspectorEN,
    tool: toolEN,
    config: configEN,
    overlay: overlayEN,
    construction: constructionEN,
    errors: errorsEN,
    viewer: viewerEN
  },
  de: {
    common: commonDE,
    welcome: welcomeDE,
    toolbar: toolbarDE,
    inspector: inspectorDE,
    tool: toolDE,
    config: configDE,
    overlay: overlayDE,
    construction: constructionDE,
    errors: errorsDE,
    viewer: viewerDE
  }
}

i18n
  .use(LanguageDetector)
  .use(new XPostProcessor())
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'welcome', 'toolbar', 'inspector', 'tool', 'config', 'overlay', 'construction', 'errors', 'viewer'],

    postProcess: 'x',

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

i18n.services.formatter?.add('length', (value, lng, _options) => formatLength(value as number, lng ?? 'en'))

export default i18n
