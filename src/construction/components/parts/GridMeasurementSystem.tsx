import React, { useMemo } from 'react'

import { type LabelOrientation, SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { type Bounds2D, type PolygonWithHoles2D, newVec2 } from '@/shared/geometry'

import { type ICoordinateMapper, IdentityCoordinateMapper } from './utils/coordinateMapper'

interface GridMeasurementSystemProps {
  polygon: PolygonWithHoles2D
  displayBounds: Bounds2D
  coordinateMapper?: ICoordinateMapper
  scaleFactor?: number
}

export function GridMeasurementSystem({
  polygon,
  displayBounds,
  coordinateMapper: providedMapper,
  scaleFactor
}: GridMeasurementSystemProps): React.JSX.Element {
  // Use identity mapper if none provided
  const coordinateMapper = useMemo(() => providedMapper ?? new IdentityCoordinateMapper(), [providedMapper])

  // Calculate scaled values based on scale factor
  const scale = scaleFactor ?? 1.0
  const SCALED = useMemo(
    () => ({
      fontSize: 10 * scale,
      totalOffset: 25 * scale,
      segmentOffset: 15 * scale,
      strokeWidth: Math.max(1, 1 * scale),
      dashArray: `${2 * scale} ${2 * scale}`,
      labelThreshold: 20 * scale
    }),
    [scale]
  )
  // Extract unique X and Y coordinates from polygon points (in virtual space)
  const { xCoords, yCoords } = useMemo(() => {
    const allPoints = polygon.outer.points.concat(polygon.holes.flatMap(h => h.points))
    const xSet = new Set(allPoints.map(p => p[0]))
    const ySet = new Set(allPoints.map(p => p[1]))

    return {
      xCoords: Array.from(xSet).sort((a, b) => a - b),
      yCoords: Array.from(ySet).sort((a, b) => a - b)
    }
  }, [polygon])

  const totalWidth = xCoords[xCoords.length - 1] - xCoords[0]
  const totalHeight = yCoords[yCoords.length - 1] - yCoords[0]

  // Map X coordinates to display space and filter out those in gaps
  const displayXCoords = useMemo(() => {
    return xCoords
      .map(virtualX => {
        const displayX = coordinateMapper.toDisplay(virtualX)
        if (displayX === null) return null
        return { virtualX, displayX }
      })
      .filter((item): item is { virtualX: number; displayX: number } => item !== null)
  }, [xCoords, coordinateMapper])

  // Generate grid lines and measurements
  const gridElements = useMemo(() => {
    const elements = {
      verticalLines: [] as React.JSX.Element[],
      horizontalLines: [] as React.JSX.Element[],
      horizontalMeasurements: [] as React.JSX.Element[],
      verticalMeasurements: [] as React.JSX.Element[]
    }

    // Vertical grid lines at each X coordinate
    displayXCoords.forEach((coord, index) => {
      elements.verticalLines.push(
        <line
          key={`vline-${index}`}
          x1={coord.displayX}
          y1={displayBounds.min[1]}
          x2={coord.displayX}
          y2={displayBounds.max[1]}
          stroke="var(--color-gray-900)"
          strokeWidth={SCALED.strokeWidth}
          strokeDasharray={SCALED.dashArray}
          opacity={0.5}
        />
      )
    })

    // Horizontal grid lines at each Y coordinate, continuous across the whole beam
    yCoords.forEach((y, index) => {
      elements.horizontalLines.push(
        <line
          key={`hline-${index}`}
          x1={displayBounds.min[0]}
          y1={y}
          x2={displayBounds.max[0]}
          y2={y}
          stroke="var(--color-gray-900)"
          strokeWidth={SCALED.strokeWidth}
          strokeDasharray={SCALED.dashArray}
          opacity={0.5}
        />
      )
    })

    // Total horizontal measurements
    if (displayXCoords.length > 2) {
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key="hmeas-bottom"
          startPoint={newVec2(displayBounds.min[0], displayBounds.max[1])}
          endPoint={newVec2(displayBounds.max[0], displayBounds.max[1])}
          label={totalWidth.toFixed(0)}
          offset={SCALED.totalOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
        />,

        <SvgMeasurementIndicator
          key="hmeas-bottom"
          startPoint={newVec2(displayBounds.min[0], displayBounds.min[1])}
          endPoint={newVec2(displayBounds.max[0], displayBounds.min[1])}
          label={totalWidth.toFixed(0)}
          offset={-SCALED.totalOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
        />
      )
    }

    // Horizontal measurements between consecutive X coordinates
    for (let i = 0; i < displayXCoords.length - 1; i++) {
      const current = displayXCoords[i]
      const next = displayXCoords[i + 1]

      // Calculate the actual distance in virtual space
      const distance = next.virtualX - current.virtualX

      let labelOrientation: LabelOrientation = 'parallel'
      if (distance < SCALED.labelThreshold) {
        const prevSpace = i > 0 ? current.virtualX - displayXCoords[i - 1].virtualX : 0
        labelOrientation = prevSpace < 30 ? 'outside-end' : 'outside-start'
      }

      // Top measurement
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key={`hmeas-top-${i}`}
          startPoint={newVec2(current.displayX, displayBounds.min[1])}
          endPoint={newVec2(next.displayX, displayBounds.min[1])}
          label={distance.toFixed(0)}
          offset={-SCALED.segmentOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
          labelOrientation={labelOrientation}
        />
      )

      // Bottom measurement
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key={`hmeas-bottom-${i}`}
          startPoint={newVec2(current.displayX, displayBounds.max[1])}
          endPoint={newVec2(next.displayX, displayBounds.max[1])}
          label={distance.toFixed(0)}
          offset={SCALED.segmentOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
          labelOrientation={labelOrientation}
        />
      )
    }

    // Total vertical measurements
    if (yCoords.length > 2) {
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key="vmeas-left"
          startPoint={newVec2(displayBounds.min[0], displayBounds.min[1])}
          endPoint={newVec2(displayBounds.min[0], displayBounds.max[1])}
          label={totalHeight.toFixed(0)}
          offset={SCALED.totalOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
        />,

        <SvgMeasurementIndicator
          key="vmeas-right"
          startPoint={newVec2(displayBounds.max[0], displayBounds.min[1])}
          endPoint={newVec2(displayBounds.max[0], displayBounds.max[1])}
          label={totalHeight.toFixed(0)}
          offset={-SCALED.totalOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
        />
      )
    }

    // Vertical measurements between consecutive Y coordinates
    for (let i = 0; i < yCoords.length - 1; i++) {
      const currentY = yCoords[i]
      const nextY = yCoords[i + 1]
      const distance = nextY - currentY

      let labelOrientation: LabelOrientation = 'parallel'
      if (distance < SCALED.labelThreshold) {
        const prevSpace = i > 0 ? currentY - yCoords[i - 1] : 0
        labelOrientation = prevSpace < 30 ? 'outside-end' : 'outside-start'
      }

      // Left measurement
      elements.verticalMeasurements.push(
        <SvgMeasurementIndicator
          key={`vmeas-left-${i}`}
          startPoint={newVec2(displayBounds.min[0], currentY)}
          endPoint={newVec2(displayBounds.min[0], nextY)}
          label={distance.toFixed(0)}
          offset={SCALED.segmentOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
          labelOrientation={labelOrientation}
        />
      )

      // Right measurement
      elements.verticalMeasurements.push(
        <SvgMeasurementIndicator
          key={`vmeas-right-${i}`}
          startPoint={newVec2(displayBounds.max[0], currentY)}
          endPoint={newVec2(displayBounds.max[0], nextY)}
          label={distance.toFixed(0)}
          offset={-SCALED.segmentOffset}
          color="var(--color-gray-900)"
          fontSize={SCALED.fontSize}
          strokeWidth={SCALED.strokeWidth}
          labelOrientation={labelOrientation}
        />
      )
    }

    return elements
  }, [displayXCoords, yCoords, displayBounds, coordinateMapper])

  return (
    <g className="grid-measurement-system">
      {/* Grid lines */}
      <g className="grid-lines">{[...gridElements.verticalLines, ...gridElements.horizontalLines]}</g>

      {/* Measurements */}
      <g className="measurements">{[...gridElements.horizontalMeasurements, ...gridElements.verticalMeasurements]}</g>
    </g>
  )
}
