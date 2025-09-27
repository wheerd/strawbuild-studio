export interface Tag {
  displayName: string
}

export const ALL_CATEGORIES = {
  straw: { displayName: 'Straw' },
  wallWood: { displayName: 'Wall Wood' } // TODO: Better name
} as const

export type CategoryId = keyof typeof ALL_CATEGORIES

export const CATEGORIES: Record<CategoryId, TagCategory> = ALL_CATEGORIES

export interface TagCategory {
  displayName: string
}

type ValidTagId = `${CategoryId}.${string}`

const ALL_TAGS = {
  'straw.full-bale': {
    displayName: 'Full Strawbale'
  },
  'straw.partial-bale': {
    displayName: 'Partial Strawbale'
  },
  'straw.stuffed': {
    displayName: 'Stuffed Straw'
  },
  'wallWood.post': {
    displayName: 'Post'
  }
} satisfies Record<ValidTagId, Tag>

export type TagId = keyof typeof ALL_TAGS

export const TAGS: Record<TagId, Tag> = ALL_TAGS
