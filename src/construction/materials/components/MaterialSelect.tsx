import { CircleIcon, CubeIcon, LayersIcon, OpacityIcon } from '@radix-ui/react-icons'
import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { Material, MaterialId } from '@/construction/materials/material'
import { useMaterials } from '@/construction/materials/store'

const NONE_VALUE = '__material_none__'

export interface MaterialSelectProps {
  value: MaterialId | null | undefined
  onValueChange: (materialId: MaterialId | null) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  materials?: Material[]
  allowEmpty?: boolean
  emptyLabel?: string
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

function StrawbaleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 9 12 6 18 9 12 12 6 9Z" />
      <path d="M6 9v6l6 3v-6L6 9Z" />
      <path d="M18 9v6l-6 3v-6l6-3Z" />
      <path d="M8.5 7.3v6.7" />
      <path d="M15.5 8.3v6.7" />
      <path d="M6 12.2l6 2.9 6-2.9" />
      <path d="M9 15.1l-3-.9" />
      <path d="m15 15.1 3-.9" />
    </svg>
  )
}

export function getMaterialTypeIcon(type: Material['type']): IconComponent {
  switch (type) {
    case 'dimensional':
      return CubeIcon
    case 'sheet':
      return LayersIcon
    case 'volume':
      return OpacityIcon
    case 'generic':
      return CircleIcon
    case 'strawbale':
      return StrawbaleIcon
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
    case 'strawbale':
      return 'Strawbale'
  }
}

export function MaterialSelect({
  value,
  onValueChange,
  placeholder = 'Select material...',
  size = '2',
  disabled = false,
  materials: materialsProp,
  allowEmpty = false,
  emptyLabel = 'None'
}: MaterialSelectProps): React.JSX.Element {
  const materialsFromStore = useMaterials()
  const materials = materialsProp ?? materialsFromStore
  const normalizedValue = value ?? (allowEmpty ? NONE_VALUE : '')

  return (
    <Select.Root
      value={normalizedValue}
      onValueChange={val => onValueChange(val === NONE_VALUE ? null : (val as MaterialId))}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {allowEmpty && (
          <Select.Item value={NONE_VALUE}>
            <Text color="gray">{emptyLabel}</Text>
          </Select.Item>
        )}
        {materials.length === 0 ? (
          <Select.Item value="-" disabled>
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
