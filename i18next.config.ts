import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en', 'de', 'fr'],
  extract: {
    input: 'src/**/*.{ts,tsx}',
    ignore: '**/*.{d,test}.{ts,tsx}',
    output: 'src/shared/i18n/locales/{{language}}/{{namespace}}.json',
    functions: ['t', '*.t', 'i18next.t'],
    preservePatterns: [
      'common:nav.*',
      'config:*.defaults.*',
      'config:*.presets.*',
      'config:*.types.*',
      'config:walls.interiorTypes.*',
      'config:layers.orientation.after.*',
      'config:layerSets.uses.*',
      'config:tabs.*',
      'construction:areaTypes.*',
      'construction:moduleTypes.*',
      'construction:strawCategories.*',
      'construction:tagCategories.*',
      'construction:tags.*',
      'construction:plan.views.*',
      'errors:construction.*',
      'inspector:constraint.*',
      'inspector:perimeterCorner.cannotDelete*',
      'inspector:perimeterWall.cannotDelete*',
      'tool:addOpening.presets.*',
      'tool:perimeterPreset.types.*',
      'tool:splitWall.errors.*',
      'toolbar:groups.*',
      'toolbar:tools.*',
      'viewer:export.exportError.*'
    ],
    removeUnusedKeys: true
  }
})
