import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en', 'de'],
  extract: {
    input: 'src/**/*.{js,jsx,ts,tsx}',
    output: 'src/shared/i18n/locales/{{language}}/{{namespace}}.json',
    functions: ['t', '*.t', 'i18next.t', 'yieldError', 'yieldWarning'],
    preservePatterns: ['errors:construction.*']
  }
})
