import { Eye, EyeOff } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import type { GroupOrElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { type Tag, type TagCategoryId, type TagId } from '@/construction/tags'
import { useCategoryLabel } from '@/construction/useCategoryLabel'
import { useTagLabel } from '@/construction/useTagLabel'
import { useTagOpacityActions, useTagOpacityForceUpdate } from '@/construction/viewer3d/context/TagOpacityContext'

export interface TagOpacityMenuProps {
  model: ConstructionModel
}

function collectTagsFromModel(model: ConstructionModel): Map<TagCategoryId, Tag[]> {
  const tagMap = new Map<TagId, Tag>()

  const addTags = (tags?: Tag[]) => {
    tags?.forEach(tag => {
      if (!tagMap.has(tag.id)) {
        tagMap.set(tag.id, tag)
      }
    })
  }

  // Recursively collect from elements/groups
  const collectFromElement = (el: GroupOrElement) => {
    addTags(el.tags)
    if ('children' in el) {
      el.children.forEach(collectFromElement)
    }
  }

  model.elements.forEach(collectFromElement)

  // Group by category
  const categoryMap = new Map<TagCategoryId, Tag[]>()
  tagMap.forEach(tag => {
    const existing = categoryMap.get(tag.category)
    if (existing) {
      existing.push(tag)
    } else {
      categoryMap.set(tag.category, [tag])
    }
  })

  return categoryMap
}

// Helper component to render a category label using translations
function CategoryLabel({ categoryId }: { categoryId: TagCategoryId }) {
  const label = useCategoryLabel(categoryId)
  return <>{label}</>
}

// Helper component to render a tag label using translations
function TagLabel({ tag }: { tag: Tag }) {
  const label = useTagLabel(tag)
  return <>{label}</>
}

export function TagOpacityMenu({ model }: TagOpacityMenuProps): React.JSX.Element {
  const { t } = useTranslation('viewer')

  // This component re-renders on any opacity change (to update the UI)
  useTagOpacityForceUpdate()

  const { getTagOrCategoryOpacity, getCategoryOpacityState, cycleTagOrCategoryOpacity } = useTagOpacityActions()

  const getOpacityLabel = (opacity: number): string => {
    if (opacity === 1.0) return t($ => $.tagOpacity.fullCategory)
    if (opacity === 0.5) return t($ => $.tagOpacity.semiCategory)
    return t($ => $.tagOpacity.hideCategory)
  }

  const tagsByCategory = useMemo(() => collectTagsFromModel(model), [model])

  // Get category IDs (sorted alphabetically by ID for now - will be sorted by translated label in render)
  const sortedCategories = useMemo(() => {
    return Array.from(tagsByCategory.entries()).sort(([catA], [catB]) => catA.localeCompare(catB))
  }, [tagsByCategory])

  const renderOpacityIcon = (opacity: number) => {
    if (opacity === 1.0) {
      return <Eye className="size-8" />
    } else if (opacity === 0.5) {
      return <Eye className="size-8 opacity-50" />
    } else {
      return <EyeOff className="size-8" />
    }
  }

  const renderStateIcon = (state: 'visible' | 'partial' | 'hidden') => {
    switch (state) {
      case 'visible':
        return <Eye className="size-8" />
      case 'partial':
        return <Eye className="size-8 opacity-50" />
      case 'hidden':
        return <EyeOff className="size-8" />
    }
  }

  if (sortedCategories.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button size="icon-sm" variant="outline" title={t($ => $.tagOpacity.title)} disabled>
            <Eye />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled>
            <span className="text-sm">{t($ => $.tagOpacity.noTags)}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button size="icon-sm" variant="default" title={t($ => $.tagOpacity.title)}>
          <Eye />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {sortedCategories.map(([categoryId, tags]) => {
          const tagIds = tags.map(t => t.id as TagId)
          const categoryState = getCategoryOpacityState(categoryId, tagIds)
          const categoryOpacity = getTagOrCategoryOpacity(categoryId)

          return (
            <DropdownMenu.Sub key={categoryId}>
              <DropdownMenu.SubTrigger>
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm">
                    <CategoryLabel categoryId={categoryId} />
                  </span>
                  {renderStateIcon(categoryState)}
                </div>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                {/* Category-wide opacity cycle */}
                <DropdownMenu.Item
                  onSelect={e => {
                    e.stopPropagation()
                    cycleTagOrCategoryOpacity(categoryId)
                  }}
                  className="flex w-full items-center justify-between gap-2"
                >
                  <span className="text-sm font-bold">{getOpacityLabel(categoryOpacity)}</span>
                  {renderOpacityIcon(categoryOpacity)}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                {/* Individual tag opacity controls */}
                {tags.map(tag => {
                  const tagOpacity = getTagOrCategoryOpacity(tag.id)
                  return (
                    <DropdownMenu.Item
                      key={tag.id}
                      onSelect={e => {
                        e.preventDefault()
                        cycleTagOrCategoryOpacity(tag.id)
                      }}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <span className="text-sm">
                        <TagLabel tag={tag} />
                      </span>
                      {renderOpacityIcon(tagOpacity)}
                    </DropdownMenu.Item>
                  )
                })}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          )
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
