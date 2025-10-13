import type {
  FloorConstructionConfigId,
  PerimeterConstructionMethodId,
  RingBeamConstructionMethodId
} from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import type { RingBeamConfig } from '@/construction/ringBeams/ringBeams'
import type {
  BaseConstructionConfig,
  InfillConstructionConfig,
  StrawhengeConstructionConfig
} from '@/construction/walls'
import type { ModulesConstructionConfig } from '@/construction/walls/strawhenge/all-modules'
import type { Length } from '@/shared/geometry'

/*
  This is what the wall + floor construction looks like from the side:

  |   |              |   | Floor Bottom layers
  |   |              |   +--------------------------------
  |   |              |   |                 .
  |   |    Header    |   |       I         .      
  +---+--------------+---+       n         .
  .   .              .   .       s         .
  .   .              .   .       i         .
  .   .   Opening    .   .       d         .
  .   .              .   .       e       Storey
  .   .              .   .               Height    
  +---+--------------+---+ . . .           .
  |   |     Sill     | I |     .           .
  |   |              | n |     .           .
  | O |              | s |     .           .
  | u |              | i |   Sill          .
  | t |              | d |   Height        .
  | s |              | e |     .           .
O | i |              |   |     .           .
u | d |              | L |     .           .
t | e |              | a |     .           .
s |   |              | y |     .           .
i | L |     Wall     | e |     .           .
d | a | Construction | r +--------------------------------  }
e | y +--------------+ s | Floor top layers                 }
  | e |    Bottom    +---+--------------------------------  }
  | r |    Plate     | Floor Construction Top Offset        }
  | s +--------------+ . . . . . . . . . . . . . . . . . .  }
  |   |       Floor Construction                            } Floor
  |   +--------------+ . . . . . . . . . . . . . . . . . .  } Thickness
  |   |     Top      | Floor Construction Bottom Offset     }      
  |   |    Plate     +---+--------------------------------  }
  |   +--------------+ I | Floor Bottom layers              }
  |   |     Wall     | n +--------------------------------  }
  |   | Construction | s |
  |   |              | i |
  |   |              | d |
  |   |              | e |
*/

export interface RingBeamConstructionMethod {
  id: RingBeamConstructionMethodId
  name: string
  config: RingBeamConfig
}

// Placeholder config interface for non-strawbale construction
export interface NonStrawbaleConfig extends BaseConstructionConfig {
  type: 'non-strawbale'
  material: MaterialId
  thickness: number
}

export interface WallLayersConfig {
  insideThickness: Length
  outsideThickness: Length
}

export type PerimeterConstructionConfig =
  | InfillConstructionConfig
  | StrawhengeConstructionConfig
  | ModulesConstructionConfig
  | NonStrawbaleConfig

export interface PerimeterConstructionMethod {
  id: PerimeterConstructionMethodId
  name: string
  config: PerimeterConstructionConfig
  layers: WallLayersConfig
}

export type FloorConstructionType = 'clt' | 'joist'

export interface FloorBaseConstructionConfig {
  id: FloorConstructionConfigId
  name: string
  type: FloorConstructionType
  layers: FloorLayersConfig
}

export interface FloorLayersConfig {
  bottomThickness: Length
  topThickness: Length
}

export interface CltConstructionConfig extends FloorBaseConstructionConfig {
  type: 'clt'
  thickness: Length
  material: MaterialId
}

export interface JoistFloorConstructionConfig extends FloorBaseConstructionConfig {
  type: 'joist'
  joistThickness: Length
  joistHeight: Length
  joistSpacing: Length
  joistMaterial: MaterialId
  subfloorThickness: Length
  subfloorMaterial: MaterialId
}

export type FloorConstructionConfig = CltConstructionConfig | JoistFloorConstructionConfig
