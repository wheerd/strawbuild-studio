import { Cross2Icon } from '@radix-ui/react-icons'
import { Dialog, Flex, IconButton, Skeleton, Text } from '@radix-ui/themes'
import React, { Suspense, lazy, useMemo } from 'react'

import type { PerimeterId } from '@/building/model/ids'
import { usePerimeterById } from '@/building/store'
import { constructPerimeter } from '@/construction/perimeter'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

const ConstructionViewer3D = lazy(() => import('./ConstructionViewer3D'))

export interface ConstructionViewer3DModalProps {
  perimeterId: PerimeterId
  trigger: React.ReactNode
}

export function ConstructionViewer3DModal({ perimeterId, trigger }: ConstructionViewer3DModalProps): React.JSX.Element {
  const [containerSize, containerRef] = elementSizeRef()
  const perimeter = usePerimeterById(perimeterId)

  const constructionModel = useMemo(() => {
    if (!perimeter) return null
    return constructPerimeter(perimeter)
  }, [perimeter])

  if (!perimeter) {
    return <>{trigger}</>
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content size="2" width="95%" maxWidth="95%" maxHeight="90vh" className="flex flex-col overflow-hidden">
        <Flex direction="column" gap="3" height="100%" className="overflow-hidden">
          <Dialog.Title>
            <Flex justify="between" align="center">
              3D Construction View
              <Dialog.Close>
                <IconButton variant="ghost" size="1">
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          </Dialog.Title>

          <div
            ref={containerRef}
            className="relative flex-1 min-h-[500px] max-h-[calc(100vh-200px)] overflow-hidden border border-gray-6 rounded-2"
          >
            {constructionModel ? (
              <Suspense
                fallback={
                  <Flex align="center" justify="center" style={{ height: '100%', padding: '2rem' }}>
                    <Flex direction="column" gap="4" style={{ width: '100%', maxWidth: '600px' }}>
                      <Skeleton height="40px" />
                      <Skeleton height="300px" />
                      <Flex gap="3">
                        <Skeleton height="40px" style={{ flex: 1 }} />
                        <Skeleton height="40px" style={{ flex: 1 }} />
                        <Skeleton height="40px" style={{ flex: 1 }} />
                      </Flex>
                    </Flex>
                  </Flex>
                }
              >
                <ConstructionViewer3D model={constructionModel} containerSize={containerSize} />
              </Suspense>
            ) : (
              <Flex align="center" justify="center" style={{ height: '100%' }}>
                <Text align="center" color="gray">
                  <Text size="6">⚠</Text>
                  <br />
                  <Text size="2">Failed to generate construction model</Text>
                </Text>
              </Flex>
            )}
          </div>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
