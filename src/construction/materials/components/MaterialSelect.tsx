import { BoxModelIcon, CircleIcon, CubeIcon, LayersIcon, OpacityIcon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Select, SelectValue } from '@/components/ui/select'
import type { Material, MaterialId, MaterialType } from '@/construction/materials/material'
import { useMaterials } from '@/construction/materials/store'

const NONE_VALUE = '__material_none__'

export interface MaterialSelectProps {
  value: MaterialId | null | undefined
  onValueChange: (materialId: MaterialId | null) => void
  placeholder?: string
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  materials?: Material[]
  allowEmpty?: boolean
  emptyLabel?: string
  preferredTypes?: MaterialType[]
  onlyTypes?: MaterialType[]
}

interface IconProps extends React.SVGAttributes<SVGElement> {
  children?: never
}
type IconComponent = React.ComponentType<IconProps>

function StrawbaleIcon(props: IconProps) {
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
    case 'prefab':
      return BoxModelIcon
    default:
      return CircleIcon
  }
}

/**
 * Hook to get translated material type names
 */
export function useGetMaterialTypeName() {
  const { t } = useTranslation('construction')
  return (type: Material['type']) => {
    switch (type) {
      case 'dimensional':
        return t($ => $.materialTypes.dimensional)
      case 'sheet':
        return t($ => $.materialTypes.sheet)
      case 'volume':
        return t($ => $.materialTypes.volume)
      case 'generic':
        return t($ => $.materialTypes.generic)
      case 'strawbale':
        return t($ => $.materialTypes.strawbale)
      case 'prefab':
        return t($ => $.materialTypes.prefab)
    }
  }
}

export function MaterialSelect({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  materials: materialsProp,
  allowEmpty = false,
  emptyLabel,
  preferredTypes,
  onlyTypes
}: MaterialSelectProps): React.JSX.Element {
  const { t: tConstruction } = useTranslation('construction')
  const { t } = useTranslation('config')
  const materialsFromStore = useMaterials()
  const materials = materialsProp ?? materialsFromStore
  const normalizedValue = value ?? (allowEmpty ? NONE_VALUE : '')

  const getMaterialDisplayName = (material: Material): string => {
    const nameKey = material.nameKey
    return nameKey ? t($ => $.materials.defaults[nameKey]) : material.name
  }

  const filteredMaterials = [...materials].filter(material => {
    if (onlyTypes && onlyTypes.length > 0) {
      return onlyTypes.includes(material.type)
    }
    return true
  })

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (a.type !== b.type) {
      if (preferredTypes) {
        const aIndex = preferredTypes.indexOf(a.type)
        const bIndex = preferredTypes.indexOf(b.type)
        if (aIndex !== -1 && bIndex !== -1) return aIndex < bIndex ? -1 : 1
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
      }
      return a.type < b.type ? -1 : 1
    }
    return getMaterialDisplayName(a).localeCompare(getMaterialDisplayName(b))
  })

  const translatedPlaceholder = placeholder ?? tConstruction($ => $.materialSelect.placeholder)
  const translatedEmptyLabel = emptyLabel ?? tConstruction($ => $.materialSelect.none)

  return (
    <Select.Root
      value={normalizedValue}
      onValueChange={val => {
        onValueChange(val === NONE_VALUE ? null : (val as MaterialId))
      }}
      disabled={disabled}
    >
      <Select.Trigger>
        <SelectValue placeholder={<span className="text-muted-foreground">{translatedPlaceholder}</span>} />
      </Select.Trigger>
      <Select.Content>
        {allowEmpty && (
          <Select.Item value={NONE_VALUE}>
            <span className="text-muted-foreground">{translatedEmptyLabel}</span>
          </Select.Item>
        )}
        {filteredMaterials.length === 0 ? (
          <Select.Item value="-" disabled>
            <span className="text-muted-foreground">{tConstruction($ => $.materialSelect.noMaterialsAvailable)}</span>
          </Select.Item>
        ) : (
          sortedMaterials.map(material => {
            const Icon = getMaterialTypeIcon(material.type)
            const displayName = getMaterialDisplayName(material)
            return (
              <Select.Item key={material.id} value={material.id}>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      backgroundColor: material.color
                    }}
                    className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[2px] border border-gray-700"
                  >
                    <Icon
                      width="12"
                      height="12"
                      style={{ color: 'white', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
                    />
                  </div>
                  <span>{displayName}</span>
                </div>
              </Select.Item>
            )
          })
        )}
      </Select.Content>
    </Select.Root>
  )
}
