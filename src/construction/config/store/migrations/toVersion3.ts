import { defaultStrawConfig, type MigrationState } from './shared'

export function migrateToVersion3(state: MigrationState): void {
  if (!('straw' in state) || state.straw == null) {
    state.straw = { ...defaultStrawConfig }
  }

  const wallAssemblies = state.wallAssemblyConfigs
  if (!wallAssemblies || typeof wallAssemblies !== 'object') {
    return
  }

  let migratedStrawConfig: Record<string, unknown> | null = null

  for (const assembly of Object.values(wallAssemblies as Record<string, unknown>)) {
    if (!assembly || typeof assembly !== 'object') {
      continue
    }

    const assemblyConfig = assembly as Record<string, unknown>
    if ('straw' in assemblyConfig) {
      if (migratedStrawConfig == null && assemblyConfig.straw && typeof assemblyConfig.straw === 'object') {
        migratedStrawConfig = assemblyConfig.straw as Record<string, unknown>
      }
      delete assemblyConfig.straw
    }
  }

  if (!migratedStrawConfig) {
    return
  }

  const parsed = {
    baleMinLength: Number(migratedStrawConfig.baleMinLength ?? defaultStrawConfig.baleMinLength),
    baleMaxLength: Number(
      migratedStrawConfig.baleMaxLength ?? migratedStrawConfig.baleMinLength ?? defaultStrawConfig.baleMaxLength
    ),
    baleHeight: Number(migratedStrawConfig.baleHeight ?? defaultStrawConfig.baleHeight),
    baleWidth: Number(migratedStrawConfig.baleWidth ?? defaultStrawConfig.baleWidth),
    material: typeof migratedStrawConfig.material === 'string' ? migratedStrawConfig.material : defaultStrawConfig.material
  }

  const sanitizedMin =
    Number.isFinite(parsed.baleMinLength) && parsed.baleMinLength > 0
      ? parsed.baleMinLength
      : defaultStrawConfig.baleMinLength

  const sanitizedMaxCandidate =
    Number.isFinite(parsed.baleMaxLength) && parsed.baleMaxLength > 0 ? parsed.baleMaxLength : sanitizedMin
  const sanitizedMax = sanitizedMaxCandidate >= sanitizedMin ? sanitizedMaxCandidate : sanitizedMin

  state.straw = {
    baleMinLength: sanitizedMin,
    baleMaxLength: sanitizedMax,
    baleHeight:
      Number.isFinite(parsed.baleHeight) && parsed.baleHeight > 0 ? parsed.baleHeight : defaultStrawConfig.baleHeight,
    baleWidth:
      Number.isFinite(parsed.baleWidth) && parsed.baleWidth > 0 ? parsed.baleWidth : defaultStrawConfig.baleWidth,
    material: parsed.material
  }
}
