import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
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

export interface RingBeamAssembly {
  id: RingBeamAssemblyId
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

export type WallAssemblyConfig =
  | InfillConstructionConfig
  | StrawhengeConstructionConfig
  | ModulesConstructionConfig
  | NonStrawbaleConfig

export interface WallAssembly {
  id: WallAssemblyId
  name: string
  config: WallAssemblyConfig
  layers: WallLayersConfig
}
