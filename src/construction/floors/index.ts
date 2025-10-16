import { JoistFloorAssembly } from './joists'
import { MonolithicFloorAssembly } from './monolithic'
import type { FloorAssembly, FloorAssemblyType, FloorConfig, JoistFloorConfig, MonolithicFloorConfig } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FLOOR_ASSEMBLIES: Record<FloorAssemblyType, FloorAssembly<any>> = {
  monolithic: new MonolithicFloorAssembly(),
  joist: new JoistFloorAssembly()
}

export * from './types'
export * from './monolithic'
export * from './joists'

export const validateFloorConfig = (config: FloorConfig): void => {
  if (config.layers.topThickness < 0 || config.layers.bottomThickness < 0) {
    throw new Error('Layer thicknesses cannot be negative')
  }

  if (config.type === 'monolithic') {
    validateMonolithicFloorConfig(config)
  } else if (config.type === 'joist') {
    validateJoistFloorConfig(config)
  } else {
    throw new Error('Invalid floor assembly type')
  }
}

const validateMonolithicFloorConfig = (config: MonolithicFloorConfig): void => {
  if (config.thickness <= 0) {
    throw new Error('CLT thickness must be greater than 0')
  }
}

const validateJoistFloorConfig = (config: JoistFloorConfig): void => {
  if (config.joistHeight <= 0 || config.joistThickness <= 0) {
    throw new Error('Joist dimensions must be greater than 0')
  }
  if (config.joistSpacing <= 0) {
    throw new Error('Joist spacing must be greater than 0')
  }
  if (config.subfloorThickness <= 0) {
    throw new Error('Subfloor thickness must be greater than 0')
  }
}
