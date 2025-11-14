import type { FloorAssemblyId, RingBeamAssemblyId, RoofAssemblyId, WallAssemblyId } from '@/building/model'
import type { JoistFloorConfig, MonolithicFloorConfig } from '@/construction/floors'
import type { DoubleRingBeamConfig, FullRingBeamConfig } from '@/construction/ringBeams'
import type { MonolithicRoofConfig, PurlinRoofConfig } from '@/construction/roofs'
import type {
  InfillWallConfig,
  ModulesWallConfig,
  NonStrawbaleWallConfig,
  StrawhengeWallConfig
} from '@/construction/walls'

/*
  This is what the wall + floor construction looks like from the side:

  |   |       Floor Construction                           
  |   +--------------+ . . . . . . . . . . . . . . . . . .  
  |   |     Top      | Floor Construction Bottom Offset          
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
  | r |    Plate     | Floor Construction Top Offset        }
  | s +--------------+ . . . . . . . . . . . . . . . . . .  } . . . . . . .  Zero level for wall construction
  |   |       Floor  Construction                           } Floor
  |   +--------------+ . . . . . . . . . . . . . . . . . .  } Thickness
  |   |     Top      | Floor Construction Bottom Offset     }      
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

// Floors

export interface FloorAssemblyIdPart {
  id: FloorAssemblyId
  name: string
}

export type MonolithicFloorAssemblyConfig = MonolithicFloorConfig & FloorAssemblyIdPart
export type JoistFloorAssemblyConfig = JoistFloorConfig & FloorAssemblyIdPart

export type FloorAssemblyConfig = MonolithicFloorAssemblyConfig | JoistFloorAssemblyConfig

// Roofs

export interface RoofAssemblyIdPart {
  id: RoofAssemblyId
  name: string
}

export type MonolithicRoofAssemblyConfig = MonolithicRoofConfig & RoofAssemblyIdPart
export type PurlinRoofAssemblyConfig = PurlinRoofConfig & RoofAssemblyIdPart

export type RoofAssemblyConfig = MonolithicRoofAssemblyConfig | PurlinRoofAssemblyConfig
