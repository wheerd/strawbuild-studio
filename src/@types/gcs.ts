import gcsModule from '@salusoft89/planegcs/planegcs_dist/planegcs'

declare module '@salusoft89/planegcs' {
  // eslint-disable-next-line camelcase
  const init_planegcs_module: typeof gcsModule
}
