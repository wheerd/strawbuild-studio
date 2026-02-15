import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ConstructionModelStatusBanner } from '@/construction/components/ConstructionModelStatusBanner'
import type { ConstructionModel } from '@/construction/model'
import { type ConstructionModelId, useConstructionModel } from '@/construction/store'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { TagOpacityProvider } from './context/TagOpacityContext'
import { acquireGeometryCache, prewarmGeometryCache, releaseGeometryCache } from './utils/geometryCache'
import { acquireMaterialCache, releaseMaterialCache } from './utils/materialCache'

const ConstructionViewer3D = lazy(() => import('./ConstructionViewer3D'))

export interface ConstructionViewer3DModalProps {
  modelId: ConstructionModelId
  trigger: React.ReactNode
}

export function ConstructionViewer3DModal({ modelId, trigger }: ConstructionViewer3DModalProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const [containerSize, containerRef, setObserverActive] = elementSizeRef()
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    setObserverActive(open)
    setIsOpen(open)
  }

  return (
    <FullScreenModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={t($ => $.viewer3DModal.title)}
      trigger={trigger}
    >
      <div className="flex h-full w-full flex-col">
        <div
          ref={containerRef}
          className="relative min-h-0 flex-1 overflow-hidden rounded-md border"
          style={{
            borderColor: 'var(--color-gray-600)'
          }}
        >
          <Suspense
            fallback={
              <div className="relative h-full w-full">
                <Skeleton height="100%" />
                <div
                  className="absolute top-1/2 left-1/2 z-10 scale-[3]"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  <Spinner size="lg" />
                </div>
                <div className="absolute top-[12px] left-[12px] z-10">
                  <Skeleton
                    height="48px"
                    width="90px"
                    style={{
                      borderRadius: 'var(--radius-3)',
                      boxShadow: 'var(--shadow-3)'
                    }}
                  />
                </div>
              </div>
            }
          >
            <TagOpacityProvider>
              <ConstructionViewer3DContent modelId={modelId} containerSize={containerSize} isOpen={isOpen} />
            </TagOpacityProvider>
          </Suspense>

          <div className="absolute right-3 bottom-3 z-10 p-0">
            <ConstructionModelStatusBanner compact />
          </div>
        </div>
      </div>
    </FullScreenModal>
  )
}

function ConstructionViewer3DContent({
  modelId,
  containerSize,
  isOpen
}: {
  modelId: ConstructionModelId
  containerSize: { width: number; height: number }
  isOpen: boolean
}) {
  const constructionModel = useConstructionModel(modelId)
  const geometryReady = useGeometryPrewarm(constructionModel)
  const shouldRenderCanvas = useDeferredCanvasMount(
    isOpen && geometryReady && containerSize.width > 0 && containerSize.height > 0
  )

  useEffect(() => {
    if (!shouldRenderCanvas) {
      return
    }

    acquireGeometryCache()
    acquireMaterialCache()

    return () => {
      releaseMaterialCache()
      releaseGeometryCache()
    }
  }, [shouldRenderCanvas])

  if (!constructionModel || !shouldRenderCanvas) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <ConstructionViewer3D model={constructionModel} containerSize={containerSize} />
}

function useDeferredCanvasMount(isEnabled: boolean): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isEnabled) {
      setReady(false)
      return
    }

    let cancelled = false
    let frameId: number | null = requestAnimationFrame(() => {
      if (!cancelled) {
        setReady(true)
      }
    })

    return () => {
      cancelled = true
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    }
  }, [isEnabled])

  return ready
}

function useGeometryPrewarm(model: ConstructionModel | null): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!model) {
      setReady(false)
      return
    }

    prewarmGeometryCache(model)
    setReady(true)
  }, [model])

  return ready
}
