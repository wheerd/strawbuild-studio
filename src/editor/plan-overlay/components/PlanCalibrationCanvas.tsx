import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import type { ImagePoint } from '../types'

type SelectionMode = 'measure' | 'origin' | 'idle'

export interface PlanCalibrationCanvasProps {
  image: HTMLImageElement | null
  referencePoints: readonly ImagePoint[]
  onReferencePointsChange: (points: ImagePoint[]) => void
  originPoint: ImagePoint | null
  onOriginPointChange: (point: ImagePoint | null) => void
  mode: SelectionMode
}

const MAX_CANVAS_WIDTH = 640
const MAX_CANVAS_HEIGHT = 400

export function PlanCalibrationCanvas({
  image,
  referencePoints,
  onReferencePointsChange,
  originPoint,
  onOriginPointChange,
  mode
}: PlanCalibrationCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const canvasSize = useMemo(() => {
    if (!image) {
      return { width: MAX_CANVAS_WIDTH, height: MAX_CANVAS_HEIGHT, scaleX: 1, scaleY: 1 }
    }
    const widthScale = MAX_CANVAS_WIDTH / image.naturalWidth
    const heightScale = MAX_CANVAS_HEIGHT / image.naturalHeight
    const scale = Math.min(widthScale, heightScale, 1)
    const width = Math.max(200, Math.round(image.naturalWidth * scale))
    const height = Math.max(200, Math.round(image.naturalHeight * scale))
    return {
      width,
      height,
      scaleX: width / image.naturalWidth,
      scaleY: height / image.naturalHeight
    }
  }, [image])

  const drawPoint = useCallback(
    (ctx: CanvasRenderingContext2D, point: ImagePoint, color: string) => {
      const radius = 6
      const x = point.x * canvasSize.scaleX
      const y = point.y * canvasSize.scaleY
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      //ctx.fillStyle = color
      //ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = color
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(point.x * canvasSize.scaleX - 12, point.y * canvasSize.scaleY)
      ctx.lineTo(point.x * canvasSize.scaleX + 12, point.y * canvasSize.scaleY)
      ctx.moveTo(point.x * canvasSize.scaleX, point.y * canvasSize.scaleY - 12)
      ctx.lineTo(point.x * canvasSize.scaleX, point.y * canvasSize.scaleY + 12)
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.stroke()
    },
    [canvasSize.scaleX, canvasSize.scaleY]
  )

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    if (image) {
      ctx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height)
    }

    if (referencePoints.length === 2) {
      const start = referencePoints[0]
      const end = referencePoints[1]
      ctx.strokeStyle = '#0057D8'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(start.x * canvasSize.scaleX, start.y * canvasSize.scaleY)
      ctx.lineTo(end.x * canvasSize.scaleX, end.y * canvasSize.scaleY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    referencePoints.forEach(point => drawPoint(ctx, point, '#0047AB'))
    if (originPoint) {
      drawPoint(ctx, originPoint, '#9E2A2B')
    }
  }, [
    canvasSize.height,
    canvasSize.scaleX,
    canvasSize.scaleY,
    canvasSize.width,
    drawPoint,
    image,
    originPoint,
    referencePoints
  ])

  const convertEventToImagePoint = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): ImagePoint | null => {
      if (!canvasRef.current || !image) {
        return null
      }
      const rect = canvasRef.current.getBoundingClientRect()
      const xRatio = image.naturalWidth / rect.width
      const yRatio = image.naturalHeight / rect.height
      const x = (event.clientX - rect.left) * xRatio
      const y = (event.clientY - rect.top) * yRatio
      return { x, y }
    },
    [image]
  )

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
      const imagePoint = convertEventToImagePoint(event)
      if (!imagePoint) return

      if (mode === 'origin') {
        onOriginPointChange(imagePoint)
        return
      }

      if (mode === 'measure' || mode === 'idle') {
        if (referencePoints.length >= 2) {
          onReferencePointsChange([imagePoint])
        } else {
          onReferencePointsChange([...referencePoints, imagePoint])
        }
      }
    },
    [convertEventToImagePoint, mode, onOriginPointChange, onReferencePointsChange, referencePoints]
  )

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="rounded-md border border-gray-5 shadow-sm"
      style={{ cursor: mode === 'origin' ? 'crosshair' : 'pointer', maxWidth: '100%' }}
      onClick={handleCanvasClick}
      data-testid="plan-calibration-canvas"
    />
  )
}
