import { InfoCircledIcon } from '@radix-ui/react-icons'
import { HoverCard, IconButton, Inset } from '@radix-ui/themes'
import { type ComponentProps, type JSX, useId } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { BaseModal } from '@/shared/components/BaseModal'
import { degreesToRadians } from '@/shared/geometry'

export type Measurement = 'roofInsideOverlap' | 'roofOutsideOverlap' | 'totalRoofThickness'

export type Assembly = 'roofAssembly' | 'wallAssembly'

export type ConstructionPart =
  | 'roofTopLayers'
  | 'roofConstruction'
  | 'roofBottomLayers'
  | 'overhangBottomLayers'
  | 'insideLayer'
  | 'outsideLayer'
  | 'topPlate'
  | 'wallConstruction'

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

export function ConstructionSchematic({
  highlightedAssembly,
  highlightedMeasurement,
  highlightedPart,
  showPartLabels = true,
  showMeasurements = false,
  showAssemblyOutlines = false,
  showFinishedLevels = false,
  showFinishedSides = false
}: MeasurementDisplayConfig = {}): JSX.Element {
  /*
                                      ╱ ╱   ╱ ╱
                                     ╱ ╱   ╱ ╱
                                    ╱ ╱   ╱ ╱
                                   ╱ ╱   ╱ ╱
                                  ╱ ╱   ╱ ╱
                                 ╱ ╱   ╱ ╱
                                ╱ ╱   ╱|╱                 
                               ╱ ╱   ╱ |
                              ╱ ╱   ╱  |
                             ╱ ╱   ╱   |
                            ╱ ╱   ╱|   |
                         ...
               ╱ ╱                 |   |
              ╱ ╱                  |   |
             ╱ ╱   ╱|              |   |
            ╱ ╱   ╱ |              |   |
           ╱ ╱   ╱  |              |   |
          | ╱   ╱   |              |   |
          |╱   ╱|   |              |   |
          |   ╱ |   |              |   |
          |  ╱ ╱| O |              | I |
          | ╱ ╱ | u |              | n |
          |╱ ╱  | t |              | s |     
          | ╱ O | s +--------------+ i |
          |╱  u | i |     Top      | d |      
              t | d |    Plate     | e | 
              s | e +--------------+   | 
              i |   |              | L |
              d | L |     Wall     | a |
              e | a | Construction | y |
                | y |              | e |
                | e |              | r |
                | r |              | s |
                | s |              |   |
*/

  const marginBottomGradientId = useId()
  const marginRightGradientId = useId()
  const roofPathId = useId()
  const roofClipId = useId()
  const wallAssemblyPathId = useId()
  const wallAssemblyClipId = useId()

  const marginTop = 20
  const marginBottom = 100
  const marginLeft = 20
  const marginRight = 100

  const wallHeight = 500
  const wallWidth = 360
  const topPlateThickness = 150
  const outsideThickness = 100
  const insideThickness = 100

  const roofAngle = 30
  const roofWidth = 1100
  const overhang = 600
  const roofConstructionThickness = 300
  const roofConstructionBottomOverlap = 200
  const roofTopThickness = 100
  const roofBottomThickness = 100
  const overhangBottomThickness = 100

  const roofAngleRad = degreesToRadians(roofAngle)

  const roofTotalThickness = roofTopThickness + roofConstructionThickness + roofBottomThickness
  const roofTopThicknessVertical = roofTopThickness / Math.cos(roofAngleRad)
  const roofConstructionThicknessVertical = roofConstructionThickness / Math.cos(roofAngleRad)
  const roofBottomThicknessVertical = roofBottomThickness / Math.cos(roofAngleRad)
  const overhangBottomThicknessVertical = overhangBottomThickness / Math.cos(roofAngleRad)

  const roofDelta = roofWidth * Math.tan(roofAngleRad)
  const wallDelta = wallWidth * Math.tan(roofAngleRad)
  const overhangDelta = overhang * Math.tan(roofAngleRad)
  const totalDelta = Math.abs(roofDelta + wallDelta + overhangDelta)
  const insideLayerDelta = insideThickness * Math.tan(roofAngleRad)
  const outsideLayerDelta = outsideThickness * Math.tan(roofAngleRad)
  const marginRightDelta = marginRight * Math.tan(roofAngleRad)
  const totalThicknessDeltaX = roofTotalThickness * Math.cos(Math.PI / 2 - roofAngleRad)
  const totalThicknessDeltaY = roofTotalThickness * Math.sin(Math.PI / 2 - roofAngleRad)

  const wallLeft = marginLeft + overhang + outsideThickness
  const wallRight = wallLeft + wallWidth
  const inside = wallRight + insideThickness
  const outside = wallLeft - outsideThickness

  const roofHeight = roofDelta + wallDelta + roofTopThicknessVertical + roofConstructionThicknessVertical
  const overhangHeight = -overhangDelta - wallDelta + roofTopThicknessVertical + roofConstructionThicknessVertical
  const maxRoofHeight = Math.max(roofHeight, overhangHeight)
  const roofRight = wallRight + roofWidth
  const roofOutsideCornerY = marginTop + maxRoofHeight + (wallDelta < 0 ? wallDelta : 0)
  const roofInsideCornerY = marginTop + maxRoofHeight + (wallDelta > 0 ? -wallDelta : 0)

  const totalHeight =
    marginTop + maxRoofHeight + roofConstructionBottomOverlap + topPlateThickness + wallHeight + marginBottom
  const totalWidth = marginLeft + overhang + wallWidth + roofWidth

  const marginRightX = totalWidth - marginRight

  const wallAssemblyTopY = marginTop + maxRoofHeight + roofConstructionBottomOverlap
  const wallCoreTopY = wallAssemblyTopY + topPlateThickness
  const wallCoreHeight = wallHeight - topPlateThickness
  const wallCenterY = wallCoreTopY + wallCoreHeight / 2
  const wallCenterX = wallLeft + wallWidth / 2
  const outsideLayerLabelX = outside + outsideThickness / 2
  const insideLayerLabelX = wallRight + insideThickness / 2
  const outsideLayerLabelY = wallCenterY
  const insideLayerLabelY = wallCenterY

  const overhangLeftX = wallLeft - overhang

  const textFill = 'var(--gray-12)'
  const highlightFill = 'var(--accent-4)'
  const highlightStroke = 'var(--accent-10)'
  const measurementNeutralColor = 'var(--gray-10)'
  const finishedLevelColor = 'var(--teal-10)'
  const finishedSideColor = 'var(--sky-11)'

  const partIsHighlighted = (part?: ConstructionPart): boolean => Boolean(part && highlightedPart === part)

  const getPartFill = (part: ConstructionPart | undefined, defaultFill: string): string =>
    partIsHighlighted(part) ? highlightFill : defaultFill

  const getPartStroke = (part: ConstructionPart | undefined, defaultStroke = 'var(--gray-12)'): string =>
    partIsHighlighted(part) ? highlightStroke : defaultStroke

  const partLabelVisible = (part: ConstructionPart): boolean => showPartLabels || highlightedPart === part

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

  const roofOutlinePath = [
    `M ${overhangLeftX} ${roofOutsideCornerY + overhangDelta - roofConstructionThicknessVertical - roofTopThicknessVertical}`,
    `L ${roofRight} ${roofInsideCornerY - roofDelta - roofConstructionThicknessVertical - roofTopThicknessVertical}`,
    `V ${roofInsideCornerY - roofDelta + roofBottomThicknessVertical}`,
    `L ${inside} ${roofInsideCornerY - insideLayerDelta + roofBottomThicknessVertical}`,
    `v ${-roofBottomThicknessVertical}`,
    `L ${wallRight} ${roofInsideCornerY}`,
    `V ${wallAssemblyTopY}`,
    `h ${-wallWidth}`,
    `V ${roofOutsideCornerY}`,
    `L ${outside} ${roofOutsideCornerY + outsideLayerDelta}`,
    `v ${overhangBottomThicknessVertical}`,
    `L ${overhangLeftX} ${roofOutsideCornerY + overhangDelta + overhangBottomThicknessVertical}`,
    'Z'
  ].join(' ')

  const wallAssemblyOutlinePath = [
    `M ${wallLeft} ${roofOutsideCornerY}`,
    `V ${wallAssemblyTopY}`,
    `H ${wallRight}`,
    `V ${roofInsideCornerY}`,
    `l ${insideThickness} ${-insideLayerDelta}`,
    `V ${totalHeight}`,
    `H ${outside}`,
    `V ${roofOutsideCornerY + outsideLayerDelta}`,
    'Z'
  ].join(' ')

  const roofShapes = (
    <g key="roof-shapes">
      <path
        key="roof-top-layer"
        d={`M ${overhangLeftX} ${roofOutsideCornerY + overhangDelta - roofConstructionThicknessVertical - roofTopThicknessVertical}
            L ${roofRight} ${roofInsideCornerY - roofDelta - roofConstructionThicknessVertical - roofTopThicknessVertical}
            v ${roofTopThicknessVertical}
            L ${overhangLeftX} ${roofOutsideCornerY + overhangDelta - roofConstructionThicknessVertical}
            Z`}
        fill={getPartFill('roofTopLayers', 'var(--gray-6)')}
        stroke={getPartStroke('roofTopLayers')}
        strokeWidth="5"
      />
      <path
        key="top-roof-construction"
        d={`M ${overhangLeftX} ${roofOutsideCornerY + overhangDelta - roofConstructionThicknessVertical}
            L ${roofRight} ${roofInsideCornerY - roofDelta - roofConstructionThicknessVertical}
            v ${roofConstructionThicknessVertical}
            L ${wallRight} ${roofInsideCornerY}
            V ${wallAssemblyTopY}
            h -${wallWidth}
            V ${roofOutsideCornerY}
            L ${overhangLeftX} ${roofOutsideCornerY + overhangDelta}
            Z`}
        fill={getPartFill('roofConstruction', 'var(--gray-7)')}
        stroke={getPartStroke('roofConstruction')}
        strokeWidth="5"
      />
      <path
        key="roof-inside-bottom"
        d={`M ${inside} ${roofInsideCornerY - insideLayerDelta}
            L ${roofRight} ${roofInsideCornerY - roofDelta}
            v ${roofBottomThicknessVertical}
            L ${inside} ${roofInsideCornerY - insideLayerDelta + roofBottomThicknessVertical}
            Z`}
        fill={getPartFill('roofBottomLayers', 'var(--gray-6)')}
        stroke={getPartStroke('roofBottomLayers')}
        strokeWidth="5"
      />
      <path
        key="roof-outside-bottom"
        d={`M ${outside} ${roofOutsideCornerY + outsideLayerDelta}
            L ${overhangLeftX} ${roofOutsideCornerY + overhangDelta}
            v ${overhangBottomThicknessVertical}
            L ${outside} ${roofOutsideCornerY + outsideLayerDelta + overhangBottomThicknessVertical}
            Z`}
        fill={getPartFill('overhangBottomLayers', 'var(--gray-6)')}
        stroke={getPartStroke('overhangBottomLayers')}
        strokeWidth="5"
      />
    </g>
  )

  const wallShapes = (
    <g key="wall-shapes">
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
        height={totalHeight - wallCoreTopY}
        fill={getPartFill('wallConstruction', 'var(--gray-7)')}
        stroke={getPartStroke('wallConstruction')}
        strokeWidth="5"
      />
      <path
        key="inside-layer"
        d={`M ${wallRight} ${roofInsideCornerY}
            l ${insideThickness} ${-insideLayerDelta}
            V ${totalHeight}
            h -${insideThickness}
            Z`}
        fill={getPartFill('insideLayer', 'var(--gray-5)')}
        stroke={getPartStroke('insideLayer')}
        strokeWidth="5"
      />
      <path
        key="outside-layer"
        d={`M ${wallLeft} ${roofOutsideCornerY}
            l -${outsideThickness} ${outsideLayerDelta}
            V ${totalHeight}
            h ${outsideThickness}
            Z`}
        fill={getPartFill('outsideLayer', 'var(--gray-5)')}
        stroke={getPartStroke('outsideLayer')}
        strokeWidth="5"
      />
    </g>
  )

  const roofMeasurements = (
    <g key="roof-measurements">
      {renderMeasurement('totalRoofThickness', {
        startPoint: [
          roofRight - marginRight - (roofAngle > 0 ? totalThicknessDeltaX : 0),
          roofInsideCornerY -
            roofDelta +
            (roofAngle < 0
              ? -roofConstructionThicknessVertical - roofTopThicknessVertical
              : roofBottomThicknessVertical - totalThicknessDeltaY) +
            marginRightDelta
        ],
        endPoint: [
          roofRight - marginRight + (roofAngle < 0 ? totalThicknessDeltaX : 0),
          roofInsideCornerY -
            roofDelta +
            (roofAngle < 0
              ? -roofConstructionThicknessVertical - roofTopThicknessVertical + totalThicknessDeltaY
              : roofBottomThicknessVertical) +
            marginRightDelta
        ],
        label: 'Roof\nThickness',
        labelOrientation: 'perpendicular',
        fontSize: 50,
        strokeWidth: 10
      })}

      {renderMeasurement('roofInsideOverlap', {
        startPoint: [wallRight, roofInsideCornerY],
        endPoint: [wallRight, wallAssemblyTopY],
        label: 'Inside\nOverlap',
        labelOrientation: 'perpendicular',
        offset: 80,
        fontSize: 50,
        strokeWidth: 10
      })}

      {renderMeasurement('roofOutsideOverlap', {
        startPoint: [wallLeft, roofOutsideCornerY],
        endPoint: [wallLeft, wallAssemblyTopY],
        label: 'Outside\nOverlap',
        labelOrientation: 'perpendicular',
        offset: -80,
        fontSize: 50,
        strokeWidth: 10
      })}

      {partLabelVisible('roofTopLayers') && (
        <text
          x={0}
          y={0}
          transform={`translate(
            ${(overhangLeftX + roofRight) / 2}
            ${marginTop + (totalDelta + roofTopThicknessVertical) / 2}
          ) rotate(${-roofAngle})`}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('roofTopLayers')}
        >
          Roof Top Layers
        </text>
      )}

      {partLabelVisible('roofConstruction') && (
        <text
          x={0}
          y={0}
          transform={`translate(
            ${(overhangLeftX + roofRight) / 2}
            ${marginTop + roofTopThicknessVertical + (totalDelta + roofConstructionThicknessVertical) / 2}
          ) rotate(${-roofAngle})`}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('roofConstruction')}
        >
          Roof Construction
        </text>
      )}

      {partLabelVisible('roofBottomLayers') && (
        <text
          x={0}
          y={0}
          transform={`translate(
            ${(wallRight + roofRight) / 2}
            ${roofInsideCornerY + (roofBottomThicknessVertical - roofDelta) / 2}
          ) rotate(${-roofAngle})`}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('roofBottomLayers')}
        >
          Ceiling Layers
        </text>
      )}

      {partLabelVisible('overhangBottomLayers') && (
        <text
          x={0}
          y={0}
          transform={`translate(
            ${(overhangLeftX + wallLeft - outsideThickness) / 2}
            ${roofOutsideCornerY + (overhangBottomThicknessVertical + overhangDelta + outsideLayerDelta) / 2}
          ) rotate(${-roofAngle})`}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('overhangBottomLayers')}
        >
          Overhang Layers
        </text>
      )}

      {assemblyOutlineVisible('roofAssembly') && (
        <text
          x={0}
          y={0}
          transform={`translate(
            ${overhangLeftX + 20}
            ${marginTop + (roofAngle > 0 ? totalDelta : 0) + 20}
          ) rotate(${-roofAngle})`}
          fontSize={60}
          dominantBaseline="text-before-edge"
          fill={assemblyOutlineStroke('roofAssembly', 'var(--amber-10)')}
        >
          Roof Assembly
        </text>
      )}

      {showFinishedLevels && (
        <>
          <text
            x={0}
            y={0}
            transform={`translate(
            ${(wallRight + roofRight) / 2}
            ${roofInsideCornerY + roofBottomThicknessVertical - roofDelta / 2 + 10}
          ) rotate(${-roofAngle})`}
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-before-edge"
            fill={finishedLevelColor}
          >
            Finished Ceiling
          </text>
          <text
            x={0}
            y={0}
            transform={`translate(
              ${(overhangLeftX + wallLeft - outsideThickness) / 2}
              ${roofOutsideCornerY + overhangBottomThicknessVertical + (overhangDelta + outsideLayerDelta) / 2 + 10}
            ) rotate(${-roofAngle})`}
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-before-edge"
            fill={finishedLevelColor}
          >
            Finished Overhang
          </text>
          <text
            x={0}
            y={0}
            transform={`translate(
            ${(overhangLeftX + roofRight) / 2}
            ${marginTop + totalDelta / 2 - 10}
          ) rotate(${-roofAngle})`}
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-after-edge"
            fill={finishedLevelColor}
          >
            Finished Rooftop
          </text>
        </>
      )}
    </g>
  )

  const wallMeasurements = (
    <g key="wall-measurements">
      {partLabelVisible('topPlate') && (
        <text
          x={wallCenterX}
          y={wallAssemblyTopY + topPlateThickness / 2}
          fontSize={50}
          text-anchor="middle"
          dominantBaseline="middle"
          fill={partLabelColor('topPlate')}
        >
          Top Plate
        </text>
      )}

      {assemblyOutlineVisible('wallAssembly') && (
        <text
          fontSize={60}
          text-anchor="middle"
          dominantBaseline="text-after-edge"
          fill={assemblyOutlineStroke('wallAssembly', 'var(--ruby-10)')}
          transform={`translate(${wallCenterX} ${totalHeight - marginBottom - 10})`}
        >
          <tspan x={0} dy="-1.2em">
            Wall
          </tspan>
          <tspan x={0} dy="1.2em">
            Assembly
          </tspan>
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={500}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      style={{ background: 'var(--color-background)' }}
    >
      <defs>
        <linearGradient id={marginBottomGradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--color-background)" stop-opacity="0" />
          <stop offset="90%" stop-color="var(--color-background)" stop-opacity="1" />
        </linearGradient>
        <linearGradient id={marginRightGradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="var(--color-background)" stop-opacity="0" />
          <stop offset="90%" stop-color="var(--color-background)" stop-opacity="1" />
        </linearGradient>
        <path id={roofPathId} d={roofOutlinePath} />
        <clipPath id={roofClipId} clipPathUnits="userSpaceOnUse">
          <use href={`#${roofPathId}`} />
        </clipPath>
        <path id={wallAssemblyPathId} d={wallAssemblyOutlinePath} />
        <clipPath id={wallAssemblyClipId} clipPathUnits="userSpaceOnUse">
          <use href={`#${wallAssemblyPathId}`} />
        </clipPath>
        <style dangerouslySetInnerHTML={{ __html: 'text { font-family: monospace; }' }} />
      </defs>

      {roofShapes}
      {wallShapes}

      {assemblyOutlineVisible('roofAssembly') && (
        <use
          href={`#${roofPathId}`}
          clipPath={`url(#${roofClipId})`}
          fill="none"
          stroke={assemblyOutlineStroke('roofAssembly', 'var(--amber-10)')}
          strokeWidth={50}
          strokeLinejoin="round"
          opacity={0.4}
        />
      )}
      {assemblyOutlineVisible('wallAssembly') && (
        <use
          href={`#${wallAssemblyPathId}`}
          clipPath={`url(#${wallAssemblyClipId})`}
          fill="none"
          stroke={assemblyOutlineStroke('wallAssembly', 'var(--ruby-10)')}
          strokeWidth={50}
          strokeLinejoin="round"
          opacity={0.4}
        />
      )}

      {showFinishedSides && (
        <>
          <text
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-after-edge"
            transform={`translate(${outside - 10} ${wallCenterY}) rotate(-90)`}
            fill={finishedSideColor}
          >
            Finished Outside
          </text>
          <text
            fontSize={60}
            text-anchor="middle"
            dominantBaseline="text-after-edge"
            transform={`translate(${inside + 10} ${wallCenterY}) rotate(90)`}
            fill={finishedSideColor}
          >
            Finished Inside
          </text>

          <line
            key="finished-inside"
            x1={inside}
            y1={roofInsideCornerY - insideLayerDelta + roofBottomThicknessVertical}
            x2={inside}
            y2={totalHeight}
            stroke={finishedSideColor}
            strokeWidth={10}
          />
          <line
            key="finished-outside"
            x1={outside}
            y1={roofOutsideCornerY + outsideLayerDelta + overhangBottomThicknessVertical}
            x2={outside}
            y2={totalHeight}
            stroke={finishedSideColor}
            strokeWidth={10}
          />
        </>
      )}

      {showFinishedLevels && (
        <>
          <line
            key="finished-ceiling"
            x1={inside}
            y1={roofInsideCornerY - insideLayerDelta + roofBottomThicknessVertical}
            x2={roofRight}
            y2={roofInsideCornerY - roofDelta + roofBottomThicknessVertical}
            stroke={finishedLevelColor}
            strokeWidth={10}
          />
          <line
            key="finished-roof"
            x1={overhangLeftX}
            y1={roofOutsideCornerY + overhangDelta - roofConstructionThicknessVertical - roofTopThicknessVertical}
            x2={roofRight}
            y2={roofInsideCornerY - roofDelta - roofConstructionThicknessVertical - roofTopThicknessVertical}
            stroke={finishedLevelColor}
            strokeWidth={10}
          />
          <line
            key="finished-overhang"
            x1={overhangLeftX}
            y1={roofOutsideCornerY + overhangDelta + overhangBottomThicknessVertical}
            x2={outside}
            y2={roofOutsideCornerY + outsideLayerDelta + overhangBottomThicknessVertical}
            stroke={finishedLevelColor}
            strokeWidth={10}
          />
        </>
      )}

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
      {roofMeasurements}
      {wallMeasurements}
    </svg>
  )
}

export function RoofMeasurementInfo(config: MeasurementDisplayConfig): React.JSX.Element {
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

export function RoofMeasurementModal(): React.JSX.Element {
  return (
    <BaseModal
      title="Roof Measurement Details"
      trigger={
        <IconButton>
          <InfoCircledIcon />
        </IconButton>
      }
    >
      <ConstructionSchematic
        showPartLabels
        showAssemblyOutlines
        showFinishedLevels
        showFinishedSides
        showMeasurements
      />
    </BaseModal>
  )
}
