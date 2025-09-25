import { Pencil1Icon } from '@radix-ui/react-icons'
import { Box, Card, Code, Flex, IconButton, Select, Text } from '@radix-ui/themes'
import React, { useCallback } from 'react'

import { StoreyManagementModal } from '@/building/components/StoreyManagementModal'
import type { StoreyId } from '@/building/model/ids'
import { useActiveStoreyId, useModelActions, useStoreysOrderedByLevel } from '@/building/store'

export function getLevelColor(level: number): 'grass' | 'indigo' | 'brown' {
  if (level === 0) {
    return 'grass'
  } else if (level > 0) {
    return 'indigo'
  } else {
    return 'brown'
  }
}

export function StoreySelector(): React.JSX.Element {
  const storeysOrdered = useStoreysOrderedByLevel()
  const activeStoreyId = useActiveStoreyId()
  const { setActiveStorey } = useModelActions()

  // Display storeys in intuitive order (highest to lowest, like elevator buttons)
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  const handleStoreyChange = useCallback(
    (newStoreyId: string) => {
      console.log('Changing active storey to', newStoreyId)
      setActiveStorey(newStoreyId as StoreyId)
    },
    [setActiveStorey]
  )

  return (
    <Box bottom="2" left="2" className="absolute z-10">
      <Card size="1" variant="surface">
        <Flex align="center" gap="2">
          <Select.Root value={activeStoreyId} onValueChange={handleStoreyChange}>
            <Select.Trigger />
            <Select.Content position="popper" variant="soft">
              {storeysDisplayOrder.map(storey => (
                <Select.Item key={storey.id} value={storey.id}>
                  <Flex align="center" gap="2" as="span">
                    <Code variant="ghost" size="2" weight="bold" color={getLevelColor(storey.level)}>
                      L{storey.level}
                    </Code>
                    <Text>{storey.name}</Text>
                  </Flex>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <StoreyManagementModal
            trigger={
              <IconButton title="Manage floors" type="button">
                <Pencil1Icon />
              </IconButton>
            }
          />
        </Flex>
      </Card>
    </Box>
  )
}
