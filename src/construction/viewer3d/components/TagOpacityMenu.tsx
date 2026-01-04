import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons'
import { DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

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
    return Array.from(tagsByCategory.entries()).sort(([catA], [catB]) => String(catA).localeCompare(String(catB)))
  }, [tagsByCategory])

  const renderOpacityIcon = (opacity: number) => {
    if (opacity === 1.0) {
      return <EyeOpenIcon />
    } else if (opacity === 0.5) {
      return <EyeOpenIcon style={{ opacity: 0.5 }} />
    } else {
      return <EyeClosedIcon />
    }
  }

  const renderStateIcon = (state: 'visible' | 'partial' | 'hidden') => {
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton size="1" variant="outline" title={t($ => $.tagOpacity.title)} disabled>
            <EyeOpenIcon />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled>
            <Text size="1" color="gray">
              {t($ => $.tagOpacity.noTags)}
            </Text>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton size="1" variant="solid" title={t($ => $.tagOpacity.title)}>
          <EyeOpenIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {sortedCategories.map(([categoryId, tags]) => {
          const tagIds = tags.map(t => t.id as TagId)
          const categoryState = getCategoryOpacityState(categoryId, tagIds)
          const categoryOpacity = getTagOrCategoryOpacity(categoryId)

          return (
            <DropdownMenu.Sub key={String(categoryId)}>
              <DropdownMenu.SubTrigger>
                <Flex align="center" justify="between" width="100%" gap="2">
                  <Text size="1">
                    <CategoryLabel categoryId={categoryId} />
                  </Text>
                  {renderStateIcon(categoryState)}
                </Flex>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                {/* Category-wide opacity cycle */}
                <DropdownMenu.Item onSelect={e => e.preventDefault()}>
                  <Flex
                    align="center"
                    justify="between"
                    width="100%"
                    gap="2"
                    onClick={e => {
                      e.stopPropagation()
                      cycleTagOrCategoryOpacity(categoryId)
                    }}
                  >
                    <Text size="1" weight="bold">
                      {getOpacityLabel(categoryOpacity)}
                    </Text>
                    {renderOpacityIcon(categoryOpacity)}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                {/* Individual tag opacity controls */}
                {tags.map(tag => {
                  const tagOpacity = getTagOrCategoryOpacity(tag.id)
                  return (
                    <DropdownMenu.Item key={String(tag.id)} onSelect={e => e.preventDefault()}>
                      <Flex
                        align="center"
                        justify="between"
                        width="100%"
                        gap="2"
                        onClick={e => {
                          e.stopPropagation()
                          cycleTagOrCategoryOpacity(tag.id)
                        }}
                      >
                        <Text size="1">
                          <TagLabel tag={tag} />
                        </Text>
                        {renderOpacityIcon(tagOpacity)}
                      </Flex>
                    </DropdownMenu.Item>
                  )
                })}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          )
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
