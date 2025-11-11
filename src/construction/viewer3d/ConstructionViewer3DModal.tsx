import { Flex, Skeleton, Spinner, Text } from '@radix-ui/themes'
import React, { Suspense, lazy, use, useEffect, useState } from 'react'

import type { ConstructionModel } from '@/construction/model'
import { BaseModal } from '@/shared/components/BaseModal'
import { elementSizeRef } from '@/shared/hooks/useElementSize'
import { CanvasThemeProvider } from '@/shared/theme/CanvasThemeContext'

import { OpacityControlProvider } from './context/OpacityControlContext'

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
    <BaseModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="3D Construction View"
      trigger={trigger}
      size="2"
      width="95%"
      maxWidth="95%"
      maxHeight="90vh"
      className="flex flex-col overflow-hidden"
      resetKeys={[refreshKey]}
    >
      <Flex direction="column" gap="1" height="100%" className="overflow-hidden">
        <div
          ref={containerRef}
          className="relative flex-1 min-h-[500px] max-h-[calc(90vh-100px)] overflow-hidden border border-gray-6 rounded-2"
        >
          {modelPromise ? (
            <Suspense
              fallback={
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <Skeleton height="95vh" />
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) scale(3)',
                      zIndex: 10
                    }}
                  >
                    <Spinner size="3" />
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
              <OpacityControlProvider>
                <CanvasThemeProvider>
                  <ConstructionViewer3DContent
                    modelPromise={modelPromise}
                    containerSize={containerSize}
                    isOpen={isOpen}
                  />
                </CanvasThemeProvider>
              </OpacityControlProvider>
            </Suspense>
          ) : null}
        </div>
      </Flex>
    </BaseModal>
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
  const constructionModel = use(modelPromise)
  const shouldRenderCanvas = useDeferredCanvasMount(isOpen && containerSize.width > 0 && containerSize.height > 0)

  if (!constructionModel) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Text align="center" color="gray">
          <Text size="6">⚠</Text>
          <br />
          <Text size="2">Failed to generate construction model</Text>
        </Text>
      </Flex>
    )
  }

  if (!shouldRenderCanvas) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Spinner size="3" />
      </Flex>
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
