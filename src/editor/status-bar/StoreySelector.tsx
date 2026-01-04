import { Pencil1Icon } from '@radix-ui/react-icons'
import { Code, Flex, IconButton, Select, Text } from '@radix-ui/themes'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { StoreyManagementModal } from '@/building/components/StoreyManagementModal'
import { useStoreyName } from '@/building/hooks/useStoreyName'
import type { Storey } from '@/building/model'
import type { StoreyId } from '@/building/model/ids'
import { useActiveStoreyId, useModelActions, useStoreysOrderedByLevel } from '@/building/store'
import { clearSelection } from '@/editor/hooks/useSelectionStore'

export function getLevelColor(level: number): 'grass' | 'indigo' | 'brown' {
  if (level === 0) {
    return 'grass'
  } else if (level > 0) {
    return 'indigo'
  } else {
    return 'brown'
  }
}

function StoreyName({ storey }: { storey: Storey }) {
  const name = useStoreyName(storey)
  return <Text>{name}</Text>
}

export function StoreySelector(): React.JSX.Element {
  const { t } = useTranslation('common')
  const storeysOrdered = useStoreysOrderedByLevel()
  const activeStoreyId = useActiveStoreyId()
  const { setActiveStoreyId } = useModelActions()

  // Display storeys in intuitive order (highest to lowest, like elevator buttons)
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  const handleStoreyChange = useCallback(
    (newStoreyId: string) => {
      console.log('Changing active storey to', newStoreyId)
      setActiveStoreyId(newStoreyId as StoreyId)
      clearSelection()
    },
    [setActiveStoreyId]
  )

  return (
    <Flex align="center" gap="2">
      <Select.Root size="1" value={activeStoreyId} onValueChange={handleStoreyChange}>
        <Select.Trigger />
        <Select.Content position="popper" variant="soft">
          {storeysDisplayOrder.map(storey => (
            <Select.Item key={storey.id} value={storey.id}>
              <Flex align="center" gap="2" as="span">
                <Code variant="ghost" size="2" weight="bold" color={getLevelColor(storey.level)}>
                  L{storey.level}
                </Code>
                <StoreyName storey={storey} />
              </Flex>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <StoreyManagementModal
        trigger={
          <IconButton size="1" title={t($ => $.storeys.manageFloorsTooltip)} type="button" variant="soft">
            <Pencil1Icon />
          </IconButton>
        }
      />
    </Flex>
  )
}
