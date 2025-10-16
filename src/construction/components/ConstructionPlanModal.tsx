import { CrossCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Skeleton, Spinner } from '@radix-ui/themes'
import React, { Suspense, use, useEffect, useState } from 'react'

import { IssueDescriptionPanel } from '@/construction/components/IssueDescriptionPanel'
import type { ConstructionModel } from '@/construction/model'
import { BaseModal } from '@/shared/components/BaseModal'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { ConstructionPlan, type ViewOption } from './ConstructionPlan'

export interface ConstructionModalProps {
  title: string
  constructionModelFactory: () => Promise<ConstructionModel | null>
  views: ViewOption[]
  trigger: React.ReactNode
  refreshKey?: unknown
}

export function ConstructionPlanModal({
  title,
  constructionModelFactory,
  views,
  trigger,
  refreshKey
}: ConstructionModalProps): React.JSX.Element {
  const [modelPromise, setModelPromise] = useState<Promise<ConstructionModel | null> | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
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

  const [containerSize, containerRef] = elementSizeRef()

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={title}
      trigger={trigger}
      size="2"
      width="95%"
      maxWidth="95%"
      maxHeight="90vh"
      className="flex flex-col overflow-hidden"
      resetKeys={[refreshKey]}
    >
      <Flex direction="column" gap="3" height="100%" className="overflow-hidden">
        <div
          ref={containerRef}
          className="relative flex-1 min-h-[300px] max-h-[calc(100vh-400px)] overflow-hidden border border-gray-6 rounded-2"
        >
          {modelPromise ? (
            <Suspense
              fallback={
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <Skeleton height="95vh" />
                  <div
                    style={{
                      position: 'absolute',
                      top: '30%',
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
              <ConstructionPlanModalContent modelPromise={modelPromise} views={views} containerSize={containerSize} />
            </Suspense>
          ) : null}
        </div>

        <Box flexShrink="0">
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
              <IssueDescriptionPanel modelPromise={modelPromise} />
            </Suspense>
          ) : null}
        </Box>
      </Flex>
    </BaseModal>
  )
}

function ConstructionPlanModalContent({
  modelPromise,
  views,
  containerSize
}: {
  modelPromise: Promise<ConstructionModel | null>
  views: ViewOption[]
  containerSize: { width: number; height: number }
}) {
  const constructionModel = use(modelPromise)

  if (!constructionModel) {
    return (
      <Flex align="center" justify="center">
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>Failed to generate construction model</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  return <ConstructionPlan model={constructionModel} views={views} containerSize={containerSize} midCutActiveDefault />
}
