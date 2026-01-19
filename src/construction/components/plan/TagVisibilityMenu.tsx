import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import type { GroupOrElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { type Tag, type TagCategoryId, type TagId } from '@/construction/tags'
import { useCategoryLabel } from '@/construction/useCategoryLabel'
import { useTagLabel } from '@/construction/useTagLabel'

import { useTagVisibilityActions, useTagVisibilityForceUpdate } from './TagVisibilityContext'

export interface TagVisibilityMenuProps {
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
  model.areas.forEach(area => {
    addTags(area.tags)
  })
  model.measurements.forEach(m => {
    addTags(m.tags)
  })

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

export function TagVisibilityMenu({ model }: TagVisibilityMenuProps): React.JSX.Element {
  const { t } = useTranslation('construction')

  // Re-render on any tag visibility change to update the menu UI
  useTagVisibilityForceUpdate()

  const { isTagOrCategoryVisible, getCategoryVisibilityState, toggleTagOrCategory } = useTagVisibilityActions()

  const tagsByCategory = useMemo(() => collectTagsFromModel(model), [model])

  // Get category IDs (sorted alphabetically by ID for now - will be sorted by translated label in render)
  const sortedCategories = useMemo(() => {
    return Array.from(tagsByCategory.entries()).sort(([catA], [catB]) => catA.localeCompare(catB))
  }, [tagsByCategory])

  const renderVisibilityIcon = (state: 'visible' | 'partial' | 'hidden') => {
    switch (state) {
      case 'visible':
        return <EyeOpenIcon />
      case 'partial':
        return <EyeOpenIcon style={{ opacity: 0.5 }} />
      case 'hidden':
        return <EyeClosedIcon />
    }
  }

  if (sortedCategories.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button size="icon" variant="outline" title={t($ => $.tagVisibility.title)} disabled>
            <EyeOpenIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled>
            <span className="text-sm">{t($ => $.tagVisibility.noTags)}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button size="icon" variant="default" title={t($ => $.tagVisibility.title)}>
          <EyeOpenIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {sortedCategories.map(([categoryId, tags]) => {
          const tagIds = tags.map(t => t.id as TagId)
          const categoryState = getCategoryVisibilityState(categoryId, tagIds)

          return (
            <DropdownMenu.Sub key={categoryId}>
              <DropdownMenu.SubTrigger>
                <div className="w-full items-center justify-between gap-2">
                  <span className="text-sm">
                    <CategoryLabel categoryId={categoryId} />
                  </span>
                  {renderVisibilityIcon(categoryState)}
                </div>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                {/* Category-wide toggle */}
                <DropdownMenu.Item
                  onSelect={e => {
                    e.preventDefault()
                  }}
                >
                  <div
                    className="w-full items-center justify-between gap-2"
                    onClick={e => {
                      e.stopPropagation()
                      toggleTagOrCategory(categoryId)
                    }}
                  >
                    <span className="text-sm font-bold">
                      {isTagOrCategoryVisible(categoryId)
                        ? t($ => $.tagVisibility.hideCategory)
                        : t($ => $.tagVisibility.showCategory)}
                    </span>
                    {isTagOrCategoryVisible(categoryId) ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                {/* Individual tag toggles */}
                {tags.map(tag => (
                  <DropdownMenu.Item
                    key={tag.id}
                    onSelect={e => {
                      e.preventDefault()
                    }}
                  >
                    <div
                      className="w-full items-center justify-between gap-2"
                      onClick={e => {
                        e.stopPropagation()
                        toggleTagOrCategory(tag.id)
                      }}
                    >
                      <span className="text-sm">
                        <TagLabel tag={tag} />
                      </span>
                      {isTagOrCategoryVisible(tag.id) ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          )
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
