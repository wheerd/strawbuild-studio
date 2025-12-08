import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons'
import { DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes'
import { useMemo } from 'react'

import type { GroupOrElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { CATEGORIES, type Tag, type TagCategoryId, type TagId } from '@/construction/tags'

import { useTagVisibility } from './context/TagVisibilityContext'

export interface TagVisibilityMenuProps {
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
  model.areas.forEach(area => addTags(area.tags))
  model.measurements.forEach(m => addTags(m.tags))

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

export function TagVisibilityMenu({ model }: TagVisibilityMenuProps): React.JSX.Element {
  const { isTagVisible, isCategoryVisible, getCategoryVisibilityState, toggleTag, toggleCategory } = useTagVisibility()

  const tagsByCategory = useMemo(() => collectTagsFromModel(model), [model])

  // Sort categories alphabetically by label
  const sortedCategories = useMemo(() => {
    return Array.from(tagsByCategory.entries()).sort(([catA], [catB]) =>
      CATEGORIES[catA].label.localeCompare(CATEGORIES[catB].label)
    )
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton size="1" variant="outline" title="Tag Visibility" disabled>
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
        <IconButton size="1" variant="solid" title="Tag Visibility">
          <EyeOpenIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {sortedCategories.map(([categoryId, tags]) => {
          const tagIds = tags.map(t => t.id)
          const categoryState = getCategoryVisibilityState(categoryId, tagIds)

          return (
            <DropdownMenu.Sub key={categoryId}>
              <DropdownMenu.SubTrigger>
                <Flex align="center" justify="between" width="100%" gap="2">
                  <Text size="1">{CATEGORIES[categoryId].label}</Text>
                  {renderVisibilityIcon(categoryState)}
                </Flex>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                {/* Category-wide toggle */}
                <DropdownMenu.Item onClick={() => toggleCategory(categoryId)}>
                  <Flex align="center" justify="between" width="100%" gap="2">
                    <Text size="1" weight="bold">
                      {isCategoryVisible(categoryId) ? 'Hide' : 'Show'} Category
                    </Text>
                    {isCategoryVisible(categoryId) ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                {/* Individual tag toggles */}
                {tags.map(tag => (
                  <DropdownMenu.Item key={tag.id} onClick={() => toggleTag(tag.id)}>
                    <Flex align="center" justify="between" width="100%" gap="2">
                      <Text size="1">{tag.label}</Text>
                      {isTagVisible(tag.id) ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </Flex>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          )
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
