import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model/ids'
import { getConfigActions } from '@/construction/config/store'

export class ConfigTimestampDependencyService {
  getEffectiveWallAssemblyTimestamp(assemblyId: WallAssemblyId): number | null {
    const configActions = getConfigActions()
    const assembly = configActions.getWallAssemblyById(assemblyId)

    if (!assembly) return null

    const timestamps: (number | null)[] = [configActions.getTimestamp(assemblyId)]

    if (assembly.openingAssemblyId) {
      timestamps.push(configActions.getTimestamp(assembly.openingAssemblyId))
    }

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveRingBeamAssemblyTimestamp(assemblyId: RingBeamAssemblyId): number | null {
    const configActions = getConfigActions()
    return configActions.getTimestamp(assemblyId)
  }

  getEffectiveFloorAssemblyTimestamp(assemblyId: FloorAssemblyId): number | null {
    const configActions = getConfigActions()
    return configActions.getTimestamp(assemblyId)
  }

  getEffectiveRoofAssemblyTimestamp(assemblyId: RoofAssemblyId): number | null {
    const configActions = getConfigActions()
    return configActions.getTimestamp(assemblyId)
  }

  getEffectiveOpeningAssemblyTimestamp(assemblyId: OpeningAssemblyId): number | null {
    const configActions = getConfigActions()
    const assembly = configActions.getOpeningAssemblyById(assemblyId)

    if (!assembly) return null

    const timestamps: (number | null)[] = [configActions.getTimestamp(assemblyId)]

    if (assembly.type === 'threshold') {
      for (const threshold of assembly.thresholds) {
        timestamps.push(configActions.getTimestamp(threshold.assemblyId))
      }
    }

    return this.getMaxTimestamp(timestamps)
  }

  private getMaxTimestamp(timestamps: (number | null)[]): number | null {
    const validTimestamps = timestamps.filter((ts): ts is number => ts !== null)
    return validTimestamps.length > 0 ? Math.max(...validTimestamps) : null
  }
}

let serviceInstance: ConfigTimestampDependencyService | null = null

export const getConfigTimestampDependencyService = (): ConfigTimestampDependencyService => {
  serviceInstance ??= new ConfigTimestampDependencyService()
  return serviceInstance
}
