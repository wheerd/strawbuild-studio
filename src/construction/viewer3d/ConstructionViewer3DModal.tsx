import React, { Suspense, lazy, use, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import type { ConstructionModel } from '@/construction/model'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { TagOpacityProvider } from './context/TagOpacityContext'
import { acquireGeometryCache, prewarmGeometryCache, releaseGeometryCache } from './utils/geometryCache'
import { acquireMaterialCache, releaseMaterialCache } from './utils/materialCache'

const ConstructionViewer3D = lazy(() => import('./ConstructionViewer3D'))

export interface ConstructionViewer3DModalProps {
  constructionModelFactory: () => Promise<ConstructionModel | null>
  trigger: React.ReactNode
  refreshKey?: unknown
}

export function ConstructionViewer3DModal({
  constructionModelFactory,
  trigger,
  refreshKey
}: ConstructionViewer3DModalProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const [containerSize, containerRef, setObserverActive] = elementSizeRef()
  const [modelPromise, setModelPromise] = useState<Promise<ConstructionModel | null> | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    setObserverActive(open)
    setIsOpen(open)
    if (open && !modelPromise) {
      setModelPromise(constructionModelFactory())
    }
  }

  useEffect(() => {
    if (isOpen && refreshKey !== undefined) {
      setModelPromise(constructionModelFactory())
    }
  }, [refreshKey, isOpen, constructionModelFactory])

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
          {modelPromise ? (
            <Suspense
              fallback={
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <Skeleton height="100%" />
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) scale(3)',
                      zIndex: 10
                    }}
                  >
                    <Spinner size="lg" />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      zIndex: 10
                    }}
                  >
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
                <ConstructionViewer3DContent
                  modelPromise={modelPromise}
                  containerSize={containerSize}
                  isOpen={isOpen}
                />
              </TagOpacityProvider>
            </Suspense>
          ) : null}
        </div>
      </div>
    </FullScreenModal>
  )
}

function ConstructionViewer3DContent({
  modelPromise,
  containerSize,
  isOpen
}: {
  modelPromise: Promise<ConstructionModel | null>
  containerSize: { width: number; height: number }
  isOpen: boolean
}) {
  const { t } = useTranslation('construction')
  const constructionModel = use(modelPromise)
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

  if (!constructionModel) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="flex items-center text-gray-900">
          <span className="text-6xl">⚠</span>
          <br />
          <span className="text-base">{t($ => $.planModal.errors.failedModel)}</span>
        </span>
      </div>
    )
  }

  if (!shouldRenderCanvas) {
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
