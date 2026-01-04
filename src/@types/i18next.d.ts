import 'i18next'

import Resources from './resources'

declare module 'i18next' {
  interface CustomTypeOptions {
    enableSelector: true
    defaultNS: 'common'
    resources: Resources
  }
}
