import type {
  PerimeterConstructionMethodId,
  RingBeamConstructionMethodId,
  SlabConstructionConfigId
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
  This is what the wall + slab construction looks like from the side:

  |   |       Slab Construction                           
  |   +--------------+ . . . . . . . . . . . . . . . . . .  
  |   |     Top      | Slab Construction Bottom Offset          
  |   |    Plate     +---+-------------------------------- 
  |   +--------------+   | Floor Bottom layers             
  |   |              |   +--------------------------------
  |   |              |   |                 .
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
  | r |    Plate     | Slab Construction Top Offset         }
  | s +--------------+ . . . . . . . . . . . . . . . . . .  } . . . . . . .  Zero level for wall construction
  |   |       Slab  Construction                            } Floor
  |   +--------------+ . . . . . . . . . . . . . . . . . .  } Thickness
  |   |     Top      | Slab Construction Bottom Offset      }      
  |   |    Plate     +---+--------------------------------  }
  |   +--------------+ I | Floor Bottom layers              }
  |   |     Wall     | n +--------------------------------  }
  |   | Construction | s |                 .
  |   |              | i |                 .
  |   |              | d |                 .
  |   |              | e |                 .
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

export type SlabConstructionType = 'monolithic' | 'joist'

export interface SlabBaseConstructionConfig {
  id: SlabConstructionConfigId
  name: string
  type: SlabConstructionType
  layers: FloorLayersConfig
}

export interface FloorLayersConfig {
  bottomThickness: Length
  topThickness: Length
}

export interface MonolithicSlabConstructionConfig extends SlabBaseConstructionConfig {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
}

export interface JoistSlabConstructionConfig extends SlabBaseConstructionConfig {
  type: 'joist'
  joistThickness: Length
  joistHeight: Length
  joistSpacing: Length
  joistMaterial: MaterialId
  subfloorThickness: Length
  subfloorMaterial: MaterialId
}

export type SlabConstructionConfig = MonolithicSlabConstructionConfig | JoistSlabConstructionConfig
