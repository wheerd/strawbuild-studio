import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { resolveDefaultMaterial, type WallConstructionPlan } from '@/construction'
import type { Vec3 } from '@/types/geometry'

interface WallConstructionPlanDisplayProps {
  plan: WallConstructionPlan
  view?: ViewType
}

type ViewType = 'outside' | 'inside'

interface SvgCoordinates {
  x: number
  y: number
}

const convertConstructionToSvg = (
  position: Vec3,
  size: Vec3,
  wallHeight: number,
  wallLength: number,
  view: ViewType
): { position: SvgCoordinates; size: SvgCoordinates } => {
  const basePosition = {
    x: position[0],
    y: wallHeight - position[2] - size[2]
  }

  // For inside view, mirror the x-axis
  if (view === 'inside') {
    basePosition.x = wallLength - position[0] - size[0]
  }

  return {
    position: basePosition,
    size: {
      x: size[0],
      y: size[2]
    }
  }
}

export function WallConstructionPlanDisplay({
  plan,
  view = 'outside'
}: WallConstructionPlanDisplayProps): React.JSX.Element {
  const { length: wallLength, height: wallHeight } = plan.wallDimensions
  const elements = plan.segments.flatMap(s => s.elements)

  // Sort elements by depth (y-axis in construction coordinates) for proper z-ordering
  const sortedElements = elements.sort((a, b) => {
    // For outside view: elements with smaller y (closer to inside) render first (behind)
    // For inside view: elements with larger y (closer to outside) render first (behind)
    return view === 'outside' ? a.position[1] - b.position[1] : b.position[1] - a.position[1]
  })

  return (
    <svg
      viewBox={`0 0 ${wallLength} ${wallHeight}`}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {sortedElements.map(element => {
        const { position, size } = convertConstructionToSvg(
          element.position,
          element.size,
          wallHeight,
          wallLength,
          view
        )

        return (
          <rect
            key={element.id}
            x={position.x}
            y={position.y}
            width={size.x}
            height={size.y}
            fill={resolveDefaultMaterial(element.material)?.color}
            stroke="#000000"
            strokeWidth="5"
          />
        )
      })}
    </svg>
  )
}

interface WallConstructionPlanModalProps {
  plan: WallConstructionPlan
  children: React.ReactNode
}

export function WallConstructionPlanModal({ plan, children }: WallConstructionPlanModalProps): React.JSX.Element {
  const [view, setView] = useState<ViewType>('outside')

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-[90vw] h-[80vh] max-w-6xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">Wall Construction Plan</Dialog.Title>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">View:</label>
                <div className="flex bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setView('outside')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      view === 'outside' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Outside
                  </button>
                  <button
                    onClick={() => setView('inside')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      view === 'inside' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Inside
                  </button>
                </div>
              </div>

              <Dialog.Close asChild>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200 p-2">
              <WallConstructionPlanDisplay plan={plan} view={view} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
