import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en', 'de'],
  extract: {
    input: 'src/**/*.{ts,tsx}',
    ignore: '**/*.{d,test}.{ts,tsx}',
    output: 'src/shared/i18n/locales/{{language}}/{{namespace}}.json',
    functions: ['t', '*.t', 'i18next.t'],
    preservePatterns: [
      'errors:construction.*',
      'tool:addOpening.presets.*',
      'tool:splitWall.errors.*',
      'tool:perimeterPreset.types.*',
      'toolbar:tools.*',
      'toolbar:groups.*',
      'inspector:perimeterCorner.cannotDelete*',
      'inspector:perimeterWall.cannotDelete*',
      'inspector:constraint.*',
      'config:*.defaults.*',
      'config:*.presets.*',
      'config:*.types.*',
      'config:layerSets.uses.*',
      'construction:tags.*',
      'construction:tagCategories.*',
      'construction:areaTypes.*',
      'construction:moduleTypes.*',
      'construction:strawCategories.*',
      'viewer:export.exportError.*'
    ],
    removeUnusedKeys: true
  }
})
