import { FileTextIcon, GearIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import * as Toolbar from '@radix-ui/react-toolbar'
import { Flex, IconButton, Kbd, Separator, Text, Tooltip } from '@radix-ui/themes'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useActiveStoreyId,
  useModelActions,
  usePerimeters,
  usePerimetersOfActiveStorey,
  useStoreysOrderedByLevel
} from '@/building/store'
import TopDownPlanModal from '@/construction/components/TopDownPlanModal'
import { ConstructionPartsListModal } from '@/construction/components/parts/ConstructionPartsListModal'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'
import { constructModel, constructStorey } from '@/construction/storeys/storey'
import { ConstructionViewer3DModal } from '@/construction/viewer3d/ConstructionViewer3DModal'
import { TOOL_GROUPS, getToolInfoById } from '@/editor/tools/system/metadata'
import { replaceTool, useActiveToolId } from '@/editor/tools/system/store'
import type { ToolId } from '@/editor/tools/system/types'
import { ConstructionPlanIcon, Model3DIcon } from '@/shared/components/Icons'
import { Logo } from '@/shared/components/Logo'

export interface MainToolbarProps {
  onInfoClick?: () => void
}

export function MainToolbar({ onInfoClick }: MainToolbarProps): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const activeToolId = useActiveToolId()
  const { openConfiguration } = useConfigurationModal()

  const activeStoreyId = useActiveStoreyId()
  const activeStorey = useModelActions().getStoreyById(activeStoreyId)
  const activePerimiters = usePerimetersOfActiveStorey()
  const storeys = useStoreysOrderedByLevel()
  const perimeters = usePerimeters()

  const handleToolSelect = useCallback((toolId: ToolId) => {
    replaceTool(toolId)
  }, [])

  return (
    <Flex align="center" gap="4" style={{ borderBottom: '1px solid var(--gray-6)' }} data-testid="main-toolbar" p="3">
      {/* Logo - Compact version */}
      <Logo />
      {/* Tools positioned next to logo on the left */}
      <Toolbar.Root>
        <Flex align="center" gap="2">
          {TOOL_GROUPS.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {groupIndex > 0 && (
                <Toolbar.Separator orientation="vertical">
                  <Separator orientation="vertical" size="2" />
                </Toolbar.Separator>
              )}

              <Flex align="center" gap="1">
                {/* Group of tools */}
                {group.tools.map(toolId => {
                  const toolInfo = getToolInfoById(toolId)
                  return (
                    <Tooltip
                      key={toolId}
                      content={
                        <Flex align="center" justify="between" gap="2" as="span">
                          <Text>{toolInfo.name}</Text>
                          {toolInfo.hotkey && <Kbd>{toolInfo.hotkey.toUpperCase()}</Kbd>}
                        </Flex>
                      }
                    >
                      <Toolbar.Button asChild>
                        <IconButton
                          aria-label={toolInfo.name}
                          size="2"
                          variant={activeToolId === toolId ? 'solid' : 'surface'}
                          onClick={() => handleToolSelect(toolId)}
                        >
                          <toolInfo.iconComponent width={20} height={20} aria-hidden />
                        </IconButton>
                      </Toolbar.Button>
                    </Tooltip>
                  )
                })}
              </Flex>
            </React.Fragment>
          ))}
        </Flex>
      </Toolbar.Root>
      {/* Configuration button on the right */}
      <Flex ml="auto" gap="2" align="center">
        <TopDownPlanModal
          title={
            activeStorey
              ? t($ => $.constructionPlanForStorey, {
                  storeyName: activeStorey.name
                })
              : t($ => $.constructionPlanForActiveStorey)
          }
          factory={async () => constructStorey(activeStoreyId)}
          refreshKey={[activeStoreyId, activePerimiters]}
          trigger={
            <IconButton title={t($ => $.viewConstructionPlan)} size="2" variant="solid">
              <ConstructionPlanIcon width={20} height={20} aria-hidden />
            </IconButton>
          }
        />
        <ConstructionPartsListModal
          title={t($ => $.partsListForEntireModel)}
          constructionModelFactory={async () => constructModel()}
          refreshKey={[storeys, perimeters]}
          trigger={
            <IconButton title={t($ => $.viewPartsList)} size="2" variant="solid">
              <FileTextIcon width={20} height={20} aria-hidden />
            </IconButton>
          }
        />
        <ConstructionViewer3DModal
          constructionModelFactory={async () => constructModel()}
          refreshKey={[storeys, perimeters]}
          trigger={
            <IconButton title={t($ => $.view3DConstruction)} size="2" variant="solid">
              <Model3DIcon width={20} height={20} aria-hidden />
            </IconButton>
          }
        />
        <IconButton
          title={t($ => $.configuration)}
          variant="surface"
          size="2"
          onClick={() => openConfiguration('materials')}
        >
          <GearIcon width={20} height={20} aria-hidden />
        </IconButton>
        <IconButton title={t($ => $.about)} variant="ghost" size="2" onClick={onInfoClick}>
          <InfoCircledIcon aria-hidden />
        </IconButton>
      </Flex>
    </Flex>
  )
}
