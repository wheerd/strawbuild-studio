import { InfoCircledIcon } from '@radix-ui/react-icons'
import { HoverCard, IconButton, Inset } from '@radix-ui/themes'
import { type ComponentProps, type JSX, type ReactNode, useId } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'

export type Measurement =
  | 'storeyHeight'
  | 'roomHeight'
  | 'floorTopOffset'
  | 'floorBottomOffset'
  | 'totalFloorThickness'
  | 'wallAssemblyHeight'
  | 'wallConstructionHeight'
  | 'totalWallThickness'

export type Assembly = 'floorAssembly' | 'wallAssembly'

export type ConstructionPart =
  | 'floorTopLayers'
  | 'floorConstruction'
  | 'floorBottomLayers'
  | 'insideLayer'
  | 'outsideLayer'
  | 'plates'
  | 'topPlate'
  | 'wallConstruction'
  | 'bottomPlate'

export interface MeasurementDisplayConfig {
  showPartLabels?: boolean
  showMeasurements?: boolean
  showAssemblyOutlines?: boolean
  showFinishedLevels?: boolean
  showFinishedSides?: boolean
  highlightedMeasurement?: Measurement
  highlightedAssembly?: Assembly
  highlightedPart?: ConstructionPart
}

function ConstructionSchematic({
  highlightedAssembly,
  highlightedMeasurement,
  highlightedPart,
  showPartLabels = false,
  showMeasurements = false,
  showAssemblyOutlines = false,
  showFinishedLevels = false,
  showFinishedSides = false
}: MeasurementDisplayConfig = {}): JSX.Element {
  /*
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

  const marginTopGradientId = useId()
  const marginBottomGradientId = useId()
  const marginRightGradientId = useId()
  const upperFloorPathId = useId()
  const upperFloorClipId = useId()
  const lowerFloorPathId = useId()
  const lowerFloorClipId = useId()
  const wallAssemblyPathId = useId()
  const wallAssemblyClipId = useId()

  const marginTop = 100
  const marginBottom = 100
  const marginRight = 100
  const wallVerticalExtension = 100
  const floorProjection = 100
  const outsidePadding = 300
  const outsideThickness = 100
  const insideThickness = 100
  const wallLeft = outsidePadding + outsideThickness
  const wallWidth = 360
  const wallRight = wallLeft + wallWidth
  const inside = wallRight + insideThickness
  const floorWidth = 1100
  const floorMeasurementX = inside + floorWidth / 2 - 100
  const textFill = 'var(--gray-12)'

  const storeyHeight = 3000
  const floorConstructionThickness = 100
  const floorConstructionTopOverlap = 100
  const floorConstructionBottomOverlap = 100
  const floorTotalConstructionThickness =
    floorConstructionThickness + floorConstructionTopOverlap + floorConstructionBottomOverlap

  const floorTopThickness = 150
  const floorBottomThickness = 100
  const totalFloorThickness = floorTotalConstructionThickness + floorTopThickness + floorBottomThickness

  const wallHeight = storeyHeight - floorConstructionThickness
  const topPlateThickness = 150
  const bottomPlateThickness = 150

  const totalHeight = marginTop + storeyHeight + totalFloorThickness + marginBottom
  const totalWidth = outsidePadding + outsideThickness + wallWidth + insideThickness + floorWidth

  const marginRightX = totalWidth - marginRight
  const interiorExtentX = wallRight + insideThickness
  const roomHeightStartY = marginTop + totalFloorThickness

  const floorTopY = marginTop
  const topFloorConstructionTopY = floorTopY + floorTopThickness
  const topFloorConstructionBottomY = topFloorConstructionTopY + floorTotalConstructionThickness
  const topFloorBottomLayersTopY = topFloorConstructionBottomY
  const topFloorBottomLayersBottomY = topFloorBottomLayersTopY + floorBottomThickness

  const bottomFloorTopY = marginTop + storeyHeight
  const bottomFloorConstructionTopY = bottomFloorTopY + floorTopThickness
  const bottomFloorConstructionBottomY = bottomFloorConstructionTopY + floorTotalConstructionThickness
  const bottomFloorBottomLayersTopY = bottomFloorConstructionBottomY
  const bottomFloorBottomLayersBottomY = bottomFloorBottomLayersTopY + floorBottomThickness

  const wallAssemblyTopY = topFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap
  const wallAssemblyBottomY = wallAssemblyTopY + wallHeight
  const wallCoreTopY = wallAssemblyTopY + topPlateThickness
  const wallCoreHeight = wallHeight - topPlateThickness - bottomPlateThickness
  const wallCenterY = wallCoreTopY + wallCoreHeight / 2
  const wallCoreBottomY = wallAssemblyBottomY - bottomPlateThickness
  const bottomPlateTopY = wallAssemblyBottomY - bottomPlateThickness
  const bottomWallTopY =
    bottomFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap + bottomPlateThickness

  const insideLayerMiddleHeight = wallHeight - floorConstructionTopOverlap - floorConstructionBottomOverlap

  const wallCenterX = wallLeft + wallWidth / 2
  const outsideLayerX = wallLeft - outsideThickness
  const outsideLayerLabelX = outsideLayerX + outsideThickness / 2
  const insideLayerLabelX = wallRight + insideThickness / 2
  const outsideLayerLabelY = wallCenterY
  const insideLayerLabelY = wallCenterY

  const wallAssemblyLeftX = outsideLayerX
  const wallAssemblyRightX = wallRight + insideThickness
  const upperFloorAssemblyRightX = totalWidth + floorProjection
  const lowerFloorAssemblyRightX = totalWidth + floorProjection

  const floorTopLayersLabelY = (floorTopY + topFloorConstructionTopY) / 2
  const floorConstructionLabelY = (topFloorConstructionTopY + topFloorConstructionBottomY) / 2
  const floorBottomLayersLabelY = (topFloorBottomLayersTopY + topFloorBottomLayersBottomY) / 2
  const bottomFloorTopLayersLabelY = (bottomFloorTopY + bottomFloorConstructionTopY) / 2
  const bottomFloorConstructionLabelY = (bottomFloorConstructionTopY + bottomFloorConstructionBottomY) / 2
  const bottomFloorBottomLayersLabelY = (bottomFloorBottomLayersTopY + bottomFloorBottomLayersBottomY) / 2

  const upperBottomPlateLabelY = topFloorConstructionTopY + floorConstructionTopOverlap - bottomPlateThickness / 2
  const lowerTopPlateLabelY =
    bottomFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap + topPlateThickness / 2

  const upperFloorConstructionStepBottomY =
    topFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap
  const lowerFloorConstructionStepBottomY =
    bottomFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap
  const insideLayerMiddleBottomY = topFloorConstructionBottomY + insideLayerMiddleHeight

  const highlightFill = 'var(--accent-4)'
  const highlightStroke = 'var(--accent-10)'
  const measurementNeutralColor = 'var(--gray-10)'
  const finishedLevelColor = 'var(--teal-10)'
  const finishedSideColor = 'var(--gold-10)'

  const isPlateSegment = (part?: ConstructionPart): boolean => part === 'topPlate' || part === 'bottomPlate'

  const partIsHighlighted = (part?: ConstructionPart): boolean =>
    Boolean(part && (highlightedPart === part || (highlightedPart === 'plates' && isPlateSegment(part))))

  const getPartFill = (part: ConstructionPart | undefined, defaultFill: string): string =>
    partIsHighlighted(part) ? highlightFill : defaultFill

  const getPartStroke = (part: ConstructionPart | undefined, defaultStroke = 'var(--gray-12)'): string =>
    partIsHighlighted(part) ? highlightStroke : defaultStroke

  const partLabelVisible = (part: ConstructionPart): boolean =>
    showPartLabels || highlightedPart === part || (highlightedPart === 'plates' && isPlateSegment(part))

  const partLabelColor = (part: ConstructionPart): string => (partIsHighlighted(part) ? highlightStroke : textFill)

  const measurementVisible = (measurement: Measurement): boolean =>
    showMeasurements || highlightedMeasurement === measurement

  const measurementColor = (measurement: Measurement): string =>
    highlightedMeasurement === measurement ? highlightStroke : measurementNeutralColor

  const assemblyOutlineVisible = (assembly: Assembly): boolean =>
    showAssemblyOutlines || highlightedAssembly === assembly

  const assemblyOutlineStroke = (assembly: Assembly, defaultStroke: string): string =>
    highlightedAssembly === assembly ? highlightStroke : defaultStroke

  const renderMeasurement = (
    measurement: Measurement,
    props: Omit<ComponentProps<typeof SvgMeasurementIndicator>, 'color'>
  ): JSX.Element | null => {
    if (!measurementVisible(measurement)) {
      return null
    }

    return <SvgMeasurementIndicator {...props} color={measurementColor(measurement)} />
  }

  const upperFloorOutlinePath = [
    `M ${wallLeft} ${topFloorConstructionTopY + floorConstructionTopOverlap}`,
    `H ${wallRight}`,
    `V ${topFloorConstructionTopY}`,
    `H ${inside}`,
    `V ${floorTopY}`,
    `H ${upperFloorAssemblyRightX}`,
    `V ${topFloorBottomLayersBottomY}`,
    `H ${inside}`,
    `V ${topFloorConstructionBottomY}`,
    `H ${wallRight}`,
    `V ${upperFloorConstructionStepBottomY}`,
    `H ${wallLeft}`,
    'Z'
  ].join(' ')

  const lowerFloorOutlinePath = [
    `M ${wallLeft} ${bottomFloorConstructionTopY + floorConstructionTopOverlap}`,
    `H ${wallRight}`,
    `V ${bottomFloorConstructionTopY}`,
    `H ${inside}`,
    `V ${bottomFloorTopY}`,
    `H ${lowerFloorAssemblyRightX}`,
    `V ${bottomFloorBottomLayersBottomY}`,
    `H ${inside}`,
    `V ${bottomFloorConstructionBottomY}`,
    `H ${wallRight}`,
    `V ${lowerFloorConstructionStepBottomY}`,
    `H ${wallLeft}`,
    'Z'
  ].join(' ')

  const wallAssemblyOutlinePath = [
    `M ${wallAssemblyLeftX} ${wallAssemblyTopY}`,
    `H ${wallRight}`,
    `V ${topFloorConstructionBottomY}`,
    `H ${wallAssemblyRightX}`,
    `V ${insideLayerMiddleBottomY}`,
    `H ${wallRight}`,
    `V ${wallAssemblyBottomY}`,
    `H ${wallAssemblyLeftX}`,
    'Z'
  ].join(' ')

  const floorShapes = (
    <g key="floor-shapes">
      <g key="top-floor-group">
        <rect
          key="top-floor"
          x={inside}
          y={floorTopY}
          width={floorWidth + floorProjection}
          height={floorTopThickness}
          fill={getPartFill('floorTopLayers', 'var(--gray-6)')}
          stroke={getPartStroke('floorTopLayers')}
          strokeWidth="5"
        />
        <path
          key="top-floor-construction"
          d={`M ${wallLeft} ${topFloorConstructionTopY + floorConstructionTopOverlap}
              h ${wallWidth}
              v -${floorConstructionTopOverlap}
              H ${totalWidth + floorProjection}
              v ${floorTotalConstructionThickness}
              H ${wallRight}
              v -${floorConstructionBottomOverlap}
              H ${wallLeft} Z`}
          fill={getPartFill('floorConstruction', 'var(--gray-7)')}
          stroke={getPartStroke('floorConstruction')}
          strokeWidth="5"
        />
        <rect
          key="top-floor-bottom"
          x={inside}
          y={topFloorBottomLayersTopY}
          width={floorWidth + floorProjection}
          height={floorBottomThickness}
          fill={getPartFill('floorBottomLayers', 'var(--gray-6)')}
          stroke={getPartStroke('floorBottomLayers')}
          strokeWidth="5"
        />
      </g>
      <g key="bottom-floor-group">
        <rect
          key="bottom-floor"
          x={inside}
          y={bottomFloorTopY}
          width={floorWidth + floorProjection}
          height={floorTopThickness}
          fill={getPartFill('floorTopLayers', 'var(--gray-6)')}
          stroke={getPartStroke('floorTopLayers')}
          strokeWidth="5"
        />
        <path
          key="bottom-floor-construction"
          d={`M ${wallLeft} ${bottomFloorConstructionTopY + floorConstructionTopOverlap}
              h ${wallWidth}
              v -${floorConstructionTopOverlap}
              H ${totalWidth + floorProjection}
              v ${floorTotalConstructionThickness}
              H ${wallRight}
              v -${floorConstructionBottomOverlap}
              H ${wallLeft} Z`}
          fill={getPartFill('floorConstruction', 'var(--gray-7)')}
          stroke={getPartStroke('floorConstruction')}
          strokeWidth="5"
        />
        <rect
          key="bottom-floor-bottom"
          x={inside}
          y={bottomFloorBottomLayersTopY}
          width={floorWidth + floorProjection}
          height={floorBottomThickness}
          fill={getPartFill('floorBottomLayers', 'var(--gray-6)')}
          stroke={getPartStroke('floorBottomLayers')}
          strokeWidth="5"
        />
      </g>
    </g>
  )

  const wallShapes = (
    <g key="wall-shapes">
      <rect
        key="top-wall"
        x={wallLeft}
        y={-wallVerticalExtension}
        width={wallWidth}
        height={topFloorConstructionTopY + floorConstructionTopOverlap - bottomPlateThickness + wallVerticalExtension}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="inside-layer-top"
        x={wallRight}
        y={-wallVerticalExtension}
        width={insideThickness}
        height={topFloorConstructionTopY + wallVerticalExtension}
        fill={getPartFill('insideLayer', 'var(--gray-5)')}
        stroke={getPartStroke('insideLayer')}
        strokeWidth="5"
      />
      <rect
        key="bottom-plate-top"
        x={wallLeft}
        y={topFloorConstructionTopY + floorConstructionTopOverlap - bottomPlateThickness}
        width={wallWidth}
        height={bottomPlateThickness}
        fill={getPartFill('bottomPlate', 'var(--gray-8)')}
        stroke={getPartStroke('bottomPlate')}
        strokeWidth="5"
      />
      <rect
        key="top-plate"
        x={wallLeft}
        y={wallAssemblyTopY}
        width={wallWidth}
        height={topPlateThickness}
        fill={getPartFill('topPlate', 'var(--gray-8)')}
        stroke={getPartStroke('topPlate')}
        strokeWidth="5"
      />
      <rect
        key="wall"
        x={wallLeft}
        y={wallCoreTopY}
        width={wallWidth}
        height={wallCoreHeight}
        fill={getPartFill('wallConstruction', 'var(--gray-7)')}
        stroke={getPartStroke('wallConstruction')}
        strokeWidth="5"
      />
      <rect
        key="bottom-plate"
        x={wallLeft}
        y={bottomPlateTopY}
        width={wallWidth}
        height={bottomPlateThickness}
        fill={getPartFill('bottomPlate', 'var(--gray-8)')}
        stroke={getPartStroke('bottomPlate')}
        strokeWidth="5"
      />
      <rect
        key="inside-layer-middle"
        x={wallRight}
        y={topFloorBottomLayersTopY}
        width={insideThickness}
        height={insideLayerMiddleHeight}
        fill={getPartFill('insideLayer', 'var(--gray-5)')}
        stroke={getPartStroke('insideLayer')}
        strokeWidth="5"
      />
      <rect
        key="top-plate-bottom"
        x={wallLeft}
        y={bottomFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap}
        width={wallWidth}
        height={topPlateThickness}
        fill={getPartFill('topPlate', 'var(--gray-8)')}
        stroke={getPartStroke('topPlate')}
        strokeWidth="5"
      />
      <rect
        key="bottom-wall"
        x={wallLeft}
        y={bottomWallTopY}
        width={wallWidth}
        height={wallHeight}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="inside-layer-bottom"
        x={wallRight}
        y={bottomFloorConstructionTopY + floorTotalConstructionThickness}
        width={insideThickness}
        height={wallHeight}
        fill={getPartFill('insideLayer', 'var(--gray-5)')}
        stroke={getPartStroke('insideLayer')}
        strokeWidth="5"
      />
      <rect
        key="outside-layer"
        x={outsideLayerX}
        y={-1}
        width={outsideThickness}
        height={totalHeight + 1}
        fill={getPartFill('outsideLayer', 'var(--gray-5)')}
        stroke={getPartStroke('outsideLayer')}
        strokeWidth="5"
      />
    </g>
  )

  const heightMeasurements = (
    <g key="height-measurements">
      {renderMeasurement('storeyHeight', {
        startPoint: [marginRightX, marginTop],
        endPoint: [marginRightX, marginTop + storeyHeight],
        label: 'Storey Height',
        fontSize: 60,
        offset: 40,
        strokeWidth: 10
      })}

      {renderMeasurement('roomHeight', {
        startPoint: [marginRightX, roomHeightStartY],
        endPoint: [marginRightX, marginTop + storeyHeight],
        label: 'Room Height',
        fontSize: 60,
        offset: 120,
        strokeWidth: 10
      })}
    </g>
  )

  const floorMeasurements = (
    <g key="floor-measurements">
      {renderMeasurement('floorTopOffset', {
        startPoint: [wallRight, topFloorConstructionTopY],
        endPoint: [wallRight, topFloorConstructionTopY + floorConstructionTopOverlap],
        label: 'Construction Top Offset',
        fontSize: 50,
        offset: wallRight - floorMeasurementX,
        strokeWidth: 10,
        labelOrientation: 'perpendicular'
      })}

      {renderMeasurement('floorBottomOffset', {
        startPoint: [wallRight, topFloorConstructionBottomY - floorConstructionBottomOverlap],
        endPoint: [wallRight, topFloorConstructionBottomY],
        label: 'Construction Bottom Offset',
        fontSize: 50,
        offset: wallRight - floorMeasurementX,
        strokeWidth: 10,
        labelOrientation: 'perpendicular'
      })}

      {partLabelVisible('floorTopLayers') && (
        <text
          x={floorMeasurementX}
          y={floorTopLayersLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('floorTopLayers')}
        >
          Floor Top Layers
        </text>
      )}

      {partLabelVisible('floorConstruction') && (
        <text
          x={floorMeasurementX}
          y={floorConstructionLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('floorConstruction')}
        >
          Floor Construction
        </text>
      )}

      {partLabelVisible('floorBottomLayers') && (
        <text
          x={floorMeasurementX}
          y={floorBottomLayersLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('floorBottomLayers')}
        >
          Floor Bottom Layers
        </text>
      )}

      {partLabelVisible('floorTopLayers') && (
        <text
          x={floorMeasurementX}
          y={bottomFloorTopLayersLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('floorTopLayers')}
        >
          Floor Top Layers
        </text>
      )}

      {partLabelVisible('floorConstruction') && (
        <text
          x={floorMeasurementX}
          y={bottomFloorConstructionLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('floorConstruction')}
        >
          Floor Construction
        </text>
      )}

      {partLabelVisible('floorBottomLayers') && (
        <text
          x={floorMeasurementX}
          y={bottomFloorBottomLayersLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('floorBottomLayers')}
        >
          Floor Bottom Layers
        </text>
      )}

      {showFinishedLevels && (
        <>
          <text
            x={floorMeasurementX}
            y={topFloorBottomLayersBottomY}
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-before-edge"
            fill={finishedLevelColor}
          >
            Finished Ceiling
          </text>
          <text
            x={floorMeasurementX}
            y={bottomFloorTopY}
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-after-edge"
            fill={finishedLevelColor}
          >
            Finished Floor
          </text>
        </>
      )}

      {renderMeasurement('totalFloorThickness', {
        startPoint: [marginRightX, bottomFloorTopY],
        endPoint: [marginRightX, bottomFloorBottomLayersBottomY],
        label: 'Total\nFloor\nThickness',
        labelOrientation: 'perpendicular',
        offset: 80,
        fontSize: 60,
        strokeWidth: 10
      })}
    </g>
  )

  const wallMeasurements = (
    <g key="wall-measurements">
      {showFinishedSides && (
        <>
          <text
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-after-edge"
            transform={`translate(${outsidePadding} ${totalHeight / 2}) rotate(-90)`}
            fill={finishedSideColor}
          >
            Finished Outside
          </text>
          <text
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-after-edge"
            transform={`translate(${inside} ${totalHeight / 2}) rotate(90)`}
            fill={finishedSideColor}
          >
            Finished Inside
          </text>
          <line
            key="finished-inside"
            x1={inside}
            y1={topFloorBottomLayersBottomY}
            x2={inside}
            y2={bottomFloorTopY}
            stroke={finishedSideColor}
            strokeWidth={20}
          />
          <line
            key="finished-outside"
            x1={outsideLayerX}
            y1={0}
            x2={outsideLayerX}
            y2={totalHeight}
            stroke={finishedSideColor}
            strokeWidth={20}
          />
        </>
      )}

      {partLabelVisible('bottomPlate') && (
        <text
          x={wallCenterX}
          y={upperBottomPlateLabelY}
          fontSize={48}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('bottomPlate')}
        >
          Bottom Plate
        </text>
      )}

      {partLabelVisible('topPlate') && (
        <text
          x={wallCenterX}
          y={topFloorConstructionBottomY - floorConstructionBottomOverlap + topPlateThickness / 2}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('topPlate')}
        >
          Top Plate
        </text>
      )}

      {partLabelVisible('bottomPlate') && (
        <text
          x={wallCenterX}
          y={wallAssemblyBottomY - bottomPlateThickness / 2}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('bottomPlate')}
        >
          Bottom Plate
        </text>
      )}

      {partLabelVisible('topPlate') && (
        <text
          x={wallCenterX}
          y={lowerTopPlateLabelY}
          fontSize={48}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('topPlate')}
        >
          Top Plate
        </text>
      )}

      {partLabelVisible('outsideLayer') && (
        <text
          x={outsideLayerLabelX}
          y={outsideLayerLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90 ${outsideLayerLabelX} ${outsideLayerLabelY})`}
          fill={partLabelColor('outsideLayer')}
        >
          Outside Layers
        </text>
      )}

      {partLabelVisible('insideLayer') && (
        <text
          x={insideLayerLabelX}
          y={insideLayerLabelY}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          transform={`rotate(90 ${insideLayerLabelX} ${insideLayerLabelY})`}
          fill={partLabelColor('insideLayer')}
        >
          Inside Layers
        </text>
      )}

      {renderMeasurement('wallAssemblyHeight', {
        startPoint: [wallLeft, wallAssemblyTopY],
        endPoint: [wallLeft, wallAssemblyBottomY],
        label: 'Wall Assembly Height',
        fontSize: 60,
        offset: outsideThickness + 160,
        strokeWidth: 10
      })}

      {renderMeasurement('wallConstructionHeight', {
        startPoint: [wallLeft, wallCoreTopY],
        endPoint: [wallLeft, wallCoreBottomY],
        label: 'Wall Construction Height',
        fontSize: 60,
        offset: outsideThickness + 100,
        strokeWidth: 10
      })}

      {renderMeasurement('totalWallThickness', {
        startPoint: [outsideLayerX, wallCoreTopY],
        endPoint: [interiorExtentX, wallCoreTopY],
        label: 'Total\nWall\nThickness',
        offset: 200,
        fontSize: 60,
        strokeWidth: 10
      })}

      {partLabelVisible('wallConstruction') && (
        <g transform={`translate(${wallCenterX} ${wallCenterY})`}>
          <text
            x={0}
            y={0}
            fontSize={50}
            fill={partLabelColor('wallConstruction')}
            text-anchor="middle"
            dominantBaseline="middle"
          >
            <tspan x={0}>Wall</tspan>
            <tspan x={0} dy="1.2em">
              Construction
            </tspan>
          </text>
        </g>
      )}
    </g>
  )

  return (
    <svg height={500} viewBox={`0 0 ${totalWidth} ${totalHeight}`} style={{ background: 'var(--color-background)' }}>
      <defs>
        <linearGradient id={marginTopGradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="10%" stop-color="var(--color-background)" stop-opacity="1" />
          <stop offset="100%" stop-color="var(--color-background)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id={marginBottomGradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--color-background)" stop-opacity="0" />
          <stop offset="90%" stop-color="var(--color-background)" stop-opacity="1" />
        </linearGradient>
        <linearGradient id={marginRightGradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="var(--color-background)" stop-opacity="0" />
          <stop offset="90%" stop-color="var(--color-background)" stop-opacity="1" />
        </linearGradient>
        <path id={upperFloorPathId} d={upperFloorOutlinePath} />
        <clipPath id={upperFloorClipId} clipPathUnits="userSpaceOnUse">
          <use href={`#${upperFloorPathId}`} />
        </clipPath>
        <path id={lowerFloorPathId} d={lowerFloorOutlinePath} />
        <clipPath id={lowerFloorClipId} clipPathUnits="userSpaceOnUse">
          <use href={`#${lowerFloorPathId}`} />
        </clipPath>
        <path id={wallAssemblyPathId} d={wallAssemblyOutlinePath} />
        <clipPath id={wallAssemblyClipId} clipPathUnits="userSpaceOnUse">
          <use href={`#${wallAssemblyPathId}`} />
        </clipPath>
        <style dangerouslySetInnerHTML={{ __html: 'text { font-family: monospace; }' }} />
      </defs>

      {floorShapes}
      {wallShapes}

      {assemblyOutlineVisible('floorAssembly') && (
        <>
          <use
            href={`#${upperFloorPathId}`}
            clipPath={`url(#${upperFloorClipId})`}
            fill="none"
            stroke={assemblyOutlineStroke('floorAssembly', 'var(--amber-10)')}
            strokeWidth={40}
            strokeLinejoin="round"
            opacity={0.4}
          />
          <use
            href={`#${lowerFloorPathId}`}
            clipPath={`url(#${lowerFloorClipId})`}
            fill="none"
            stroke={assemblyOutlineStroke('floorAssembly', 'var(--amber-10)')}
            strokeWidth={40}
            strokeLinejoin="round"
            opacity={0.4}
          />
        </>
      )}
      {assemblyOutlineVisible('wallAssembly') && (
        <use
          href={`#${wallAssemblyPathId}`}
          clipPath={`url(#${wallAssemblyClipId})`}
          fill="none"
          stroke={assemblyOutlineStroke('wallAssembly', 'var(--ruby-10)')}
          strokeWidth={40}
          strokeLinejoin="round"
          opacity={0.4}
        />
      )}

      {showFinishedLevels && (
        <>
          <line
            key="finished-ceiling"
            x1={inside}
            y1={topFloorBottomLayersBottomY}
            x2={totalWidth}
            y2={topFloorBottomLayersBottomY}
            stroke={finishedLevelColor}
            strokeWidth={20}
          />
          <line
            key="finished-floor"
            x1={inside}
            y1={bottomFloorTopY}
            x2={totalWidth}
            y2={bottomFloorTopY}
            stroke={finishedLevelColor}
            strokeWidth={20}
          />
        </>
      )}

      <rect
        key="margin-top"
        x={-50}
        y={-5}
        width={totalWidth + 100}
        height={marginTop + 5}
        fill={`url(#${marginTopGradientId})`}
      />
      <rect
        key="margin-bottom"
        x={-50}
        y={totalHeight - marginBottom}
        width={totalWidth + 100}
        height={marginBottom + 5}
        fill={`url(#${marginBottomGradientId})`}
      />
      <rect
        key="margin-right"
        x={marginRightX}
        y={-50}
        width={marginRight + 5}
        height={totalHeight + 100}
        fill={`url(#${marginRightGradientId})`}
      />
      {heightMeasurements}
      {floorMeasurements}
      {wallMeasurements}
    </svg>
  )
}

export interface MeasurementInfoProps {
  trigger: ReactNode
  config?: MeasurementDisplayConfig
}
export function MeasurementInfo(config: MeasurementDisplayConfig): React.JSX.Element {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <IconButton style={{ cursor: 'help' }} color="gray" radius="full" title="Measurements" variant="ghost" size="1">
          <InfoCircledIcon width={12} height={12} />
        </IconButton>
      </HoverCard.Trigger>
      <HoverCard.Content side="right">
        <Inset>
          <ConstructionSchematic {...config} />
        </Inset>
      </HoverCard.Content>
    </HoverCard.Root>
  )
}
