import { type MigrationState, defaultStrawConfig } from './shared'

export function migrateToVersion4(state: MigrationState): void {
  const strawConfig = state.straw
  if (!strawConfig || typeof strawConfig !== 'object') {
    state.straw = { ...defaultStrawConfig }
    return
  }

  const config = strawConfig as Record<string, unknown>
  const sanitized = { ...defaultStrawConfig, ...config } as Record<string, unknown>

  const tolerance = Number(config.tolerance)
  sanitized.tolerance = Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : defaultStrawConfig.tolerance

  const topCutoffLimit = Number(config.topCutoffLimit)
  sanitized.topCutoffLimit =
    Number.isFinite(topCutoffLimit) && topCutoffLimit > 0 ? topCutoffLimit : defaultStrawConfig.topCutoffLimit

  const flakeSize = Number(config.flakeSize)
  sanitized.flakeSize = Number.isFinite(flakeSize) && flakeSize > 0 ? flakeSize : defaultStrawConfig.flakeSize

  state.straw = sanitized
}
