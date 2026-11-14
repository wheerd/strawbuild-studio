import React from 'react'
import { useTranslation } from 'react-i18next'

import { useMaterials } from '@/materials/store'
import type { Material, MaterialId, MaterialType } from '@/materials/types'
import { Select, SelectValue } from '@/shared/ui/components/select'
import { cn } from '@/shared/ui/utils'

import { getMaterialTypeIcon } from './icons'

const NONE_VALUE = '__material_none__'

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 text-sm',
  lg: 'h-10 text-base'
}

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
  size = 'base',
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
      <Select.Trigger className={cn(sizeClasses[size])}>
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
