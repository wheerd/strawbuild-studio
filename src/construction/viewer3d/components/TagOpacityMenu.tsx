import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons'
import { DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes'
import { useMemo } from 'react'

import type { GroupOrElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { CATEGORIES, type Tag, type TagCategoryId, type TagId } from '@/construction/tags'
import { useTagOpacity } from '@/construction/viewer3d/context/TagOpacityContext'

export interface TagOpacityMenuProps {
  model: ConstructionModel
}

interface TagInfo {
  id: TagId
  label: string
  category: TagCategoryId
}

function collectTagsFromModel(model: ConstructionModel): Map<TagCategoryId, TagInfo[]> {
  const tagMap = new Map<TagId, TagInfo>()

  const addTags = (tags?: Tag[]) => {
    tags?.forEach(tag => {
      if (!tagMap.has(tag.id)) {
        tagMap.set(tag.id, {
          id: tag.id,
          label: tag.label,
          category: tag.category
        })
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
  const categoryMap = new Map<TagCategoryId, TagInfo[]>()
  tagMap.forEach(tagInfo => {
    const existing = categoryMap.get(tagInfo.category)
    if (existing) {
      existing.push(tagInfo)
    } else {
      categoryMap.set(tagInfo.category, [tagInfo])
    }
  })

  // Sort tags within each category alphabetically
  categoryMap.forEach(tags => {
    tags.sort((a, b) => a.label.localeCompare(b.label))
  })

  return categoryMap
}

function getOpacityLabel(opacity: number): string {
  if (opacity === 1.0) return 'Full'
  if (opacity === 0.5) return 'Semi'
  return 'Hide'
}

export function TagOpacityMenu({ model }: TagOpacityMenuProps): React.JSX.Element {
  const { getTagOrCategoryOpacity, getCategoryOpacityState, cycleTagOrCategoryOpacity } = useTagOpacity()

  const tagsByCategory = useMemo(() => collectTagsFromModel(model), [model])

  // Sort categories alphabetically by label
  const sortedCategories = useMemo(() => {
    return Array.from(tagsByCategory.entries()).sort(([catA], [catB]) =>
      CATEGORIES[catA].label.localeCompare(CATEGORIES[catB].label)
    )
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
          <IconButton size="1" variant="outline" title="Tag Opacity" disabled>
            <EyeOpenIcon />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled>
            <Text size="1" color="gray">
              No tags available
            </Text>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton size="1" variant="solid" title="Tag Opacity">
          <EyeOpenIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {sortedCategories.map(([categoryId, tags]) => {
          const tagIds = tags.map(t => t.id)
          const categoryState = getCategoryOpacityState(categoryId, tagIds)
          const categoryOpacity = getTagOrCategoryOpacity(categoryId)

          return (
            <DropdownMenu.Sub key={categoryId}>
              <DropdownMenu.SubTrigger>
                <Flex align="center" justify="between" width="100%" gap="2">
                  <Text size="1">{CATEGORIES[categoryId].label}</Text>
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
                      {getOpacityLabel(categoryOpacity)} Category
                    </Text>
                    {renderOpacityIcon(categoryOpacity)}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                {/* Individual tag opacity controls */}
                {tags.map(tag => {
                  const tagOpacity = getTagOrCategoryOpacity(tag.id)
                  return (
                    <DropdownMenu.Item key={tag.id} onSelect={e => e.preventDefault()}>
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
                        <Text size="1">{tag.label}</Text>
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
