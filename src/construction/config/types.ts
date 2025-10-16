import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model'
import type { DoubleRingBeamConfig, FullRingBeamConfig } from '@/construction/ringBeams'
import type {
  InfillWallConfig,
  ModulesWallConfig,
  NonStrawbaleWallConfig,
  StrawhengeWallConfig
} from '@/construction/walls'

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

// Walls

export interface WallAssemblyIdPart {
  id: WallAssemblyId
  name: string
}

export type InfillWallAssemblyConfig = InfillWallConfig & WallAssemblyIdPart
export type ModulesWallAssemblyConfig = ModulesWallConfig & WallAssemblyIdPart
export type StrawhengeWallAssemblyConfig = StrawhengeWallConfig & WallAssemblyIdPart
export type NonStrawbaleWallAssemblyConfig = NonStrawbaleWallConfig & WallAssemblyIdPart

export type WallAssemblyConfig =
  | InfillWallAssemblyConfig
  | ModulesWallAssemblyConfig
  | StrawhengeWallAssemblyConfig
  | NonStrawbaleWallAssemblyConfig

// Ring beams

export interface RingBeamAssemblyIdPart {
  id: RingBeamAssemblyId
  name: string
}

export type FullRingBeamAssemblyConfig = FullRingBeamConfig & RingBeamAssemblyIdPart
export type DoubleRingBeamAssemblyConfig = DoubleRingBeamConfig & RingBeamAssemblyIdPart

export type RingBeamAssemblyConfig = FullRingBeamAssemblyConfig | DoubleRingBeamAssemblyConfig
