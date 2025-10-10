import { CircleIcon, CubeIcon, LayersIcon, OpacityIcon } from '@radix-ui/react-icons'
import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { Material, MaterialId } from '../material'
import { useMaterials } from '../store'

export interface MaterialSelectProps {
  value: MaterialId | null | undefined
  onValueChange: (materialId: MaterialId) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  materials?: Material[]
}

export function getMaterialTypeIcon(type: Material['type']) {
  switch (type) {
    case 'dimensional':
      return CubeIcon
    case 'sheet':
      return LayersIcon
    case 'volume':
      return OpacityIcon
    case 'generic':
      return CircleIcon
  }
}

export function getMaterialTypeName(type: Material['type']) {
  switch (type) {
    case 'dimensional':
      return 'Dimensional'
    case 'sheet':
      return 'Sheet'
    case 'volume':
      return 'Volume'
    case 'generic':
      return 'Generic'
  }
}

export function MaterialSelect({
  value,
  onValueChange,
  placeholder = 'Select material...',
  size = '2',
  disabled = false,
  materials: materialsProp
}: MaterialSelectProps): React.JSX.Element {
  const materialsFromStore = useMaterials()
  const materials = materialsProp ?? materialsFromStore

  return (
    <Select.Root
      value={value ?? ''}
      onValueChange={val => onValueChange(val as MaterialId)}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {materials.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No materials available</Text>
          </Select.Item>
        ) : (
          materials.map(material => {
            const Icon = getMaterialTypeIcon(material.type)
            return (
              <Select.Item key={material.id} value={material.id}>
                <Flex align="center" gap="2">
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: material.color,
                      borderRadius: '2px',
                      border: '1px solid var(--gray-7)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon
                      width="12"
                      height="12"
                      style={{ color: 'white', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
                    />
                  </div>
                  <Text>{material.name}</Text>
                </Flex>
              </Select.Item>
            )
          })
        )}
      </Select.Content>
    </Select.Root>
  )
}
