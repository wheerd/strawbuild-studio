import { CopyIcon, PlusIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  AlertDialog,
  Badge,
  Button,
  Callout,
  Checkbox,
  DropdownMenu,
  Heading,
  IconButton,
  Select,
  Separator,
  Switch,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId } from '@/building/model/ids'
import type { OpeningAssemblyConfig } from '@/construction/config'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import {
  useConfigActions,
  useDefaultOpeningAssemblyId,
  useOpeningAssemblies,
  useWallAssemblies
} from '@/construction/config/store'
import { type OpeningAssemblyUsage, getOpeningAssemblyUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import type {
  OpeningAssemblyType,
  OpeningConfig,
  PlankedOpeningConfig,
  PostOpeningConfig,
  SimpleOpeningConfig
} from '@/construction/openings/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'

import { OpeningAssemblySelect } from './OpeningAssemblySelect'

export interface OpeningAssemblyContentProps {
  initialSelectionId?: string
}

export function OpeningAssemblyContent({ initialSelectionId }: OpeningAssemblyContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const openingAssemblies = useOpeningAssemblies()
  const wallAssemblies = useWallAssemblies()
  const {
    addOpeningAssembly,
    removeOpeningAssembly,
    duplicateOpeningAssembly,
    setDefaultOpeningAssembly,
    resetOpeningAssembliesToDefaults
  } = useConfigActions()

  const defaultId = useDefaultOpeningAssemblyId()

  const allAssemblies = useMemo(() => Object.values(openingAssemblies), [openingAssemblies])
  const wallAssemblyArray = useMemo(() => Object.values(wallAssemblies), [wallAssemblies])

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && allAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return allAssemblies.length > 0 ? allAssemblies[0].id : null
  })

  const selectedAssembly = allAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getOpeningAssemblyUsage(selectedAssembly.id)
        : { isUsed: false, isDefault: false, wallAssemblyIds: [], storeyIds: [] },
    [selectedAssembly, wallAssemblyArray, defaultId]
  )

  const handleAddNew = useCallback(
    (type: OpeningAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let config: OpeningConfig
      if (type === 'simple') {
        config = {
          type: 'simple',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial
        }
      } else if (type === 'post') {
        config = {
          type: 'post',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial,
          posts: {
            type: 'double',
            infillMaterial: defaultMaterial,
            material: defaultMaterial,
            thickness: 140,
            width: 100
          },
          replacePosts: true,
          postsSupportHeader: false
        }
      } else if (type === 'planked') {
        config = {
          type: 'planked',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial,
          plankMaterial: defaultMaterial,
          plankThickness: 16
        }
      } else {
        config = {
          type: 'empty',
          padding: 15
        }
      }

      const newAssembly = addOpeningAssembly(`New opening assembly`, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addOpeningAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const newName = t($ => $.openings.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = duplicateOpeningAssembly(selectedAssembly.id, newName)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateOpeningAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = allAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeOpeningAssembly(selectedAssembly.id)

    if (allAssemblies.length > 1) {
      const nextAssembly = allAssemblies[currentIndex + 1] ?? allAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, allAssemblies, removeOpeningAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetOpeningAssembliesToDefaults()
    // Keep selection if it still exists after reset
    const stillExists = allAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && allAssemblies.length > 0) {
      setSelectedAssemblyId(allAssemblies[0].id)
    }
  }, [resetOpeningAssembliesToDefaults, selectedAssemblyId, allAssemblies])

  if (!selectedAssembly) {
    return (
      <div className="flex-col gap-4 w-full">
        <Callout.Root text-gray-900>
          <Callout.Text>{t($ => $.openings.emptyList)}</Callout.Text>
        </Callout.Root>
      </div>
    )
  }

  return (
    <div className="flex-col gap-4 w-full">
      {/* Selector + Actions */}
      <div className="flex flex-col gap-2">
        <div className="gap-2 items-end">
          <div className="flex-col gap-1 grow-1">
            <OpeningAssemblySelect
              value={(selectedAssemblyId as OpeningAssemblyId | null) ?? undefined}
              onValueChange={value => {
                setSelectedAssemblyId(value ?? null)
              }}
              showDefaultIndicator
              size="2"
            />
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title={t($ => $.common.addNew)}>
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('simple')
                }}
              >
                {t($ => $.openings.types.simple)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('post')
                }}
              >
                {t($ => $.openings.types.post)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('planked')
                }}
              >
                {t($ => $.openings.types.planked)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('empty')
                }}
              >
                {t($ => $.openings.types.empty)}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <IconButton onClick={handleDuplicate} variant="soft" title={t($ => $.common.duplicate)}>
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton
                color="red"
                variant="soft"
                disabled={usage.isUsed}
                title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
              >
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.openings.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.openings.deleteConfirm, { name: selectedAssembly.name })}
              </AlertDialog.Description>
              <div className="gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" text-gray-900>
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={handleDelete}>
                    {t($ => $.common.delete)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton color="red" variant="outline" title={t($ => $.common.resetToDefaults)}>
                <ResetIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.openings.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.openings.resetConfirm)}</AlertDialog.Description>
              <div className="gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" text-gray-900>
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={handleReset}>
                    {t($ => $.common.reset)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      </div>
      {/* Form */}
      <ConfigForm assembly={selectedAssembly} />
      <Separator size="4" />
      <div className="grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.defaultOpeningAssembly)}</span>
        </Label.Root>
        <OpeningAssemblySelect
          value={defaultId}
          onValueChange={assemblyId => {
            if (assemblyId) setDefaultOpeningAssembly(assemblyId)
          }}
          placeholder={t($ => $.common.placeholders.selectDefault)}
          size="2"
        />
      </div>
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </div>
  )
}

function UsageBadge({ id }: { id: EntityId }) {
  const label = useEntityLabel(id)
  return (
    <Badge key={id} size="2" variant="soft">
      {label}
    </Badge>
  )
}

function UsageDisplay({ usage }: { usage: OpeningAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="gap-1 flex-wrap">
        {usage.isDefault && (
          <Badge size="2" variant="soft" color="blue">
            {t($ => $.usage.globalDefault_opening)}
          </Badge>
        )}
        {usage.wallAssemblyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}

function ConfigForm({ assembly }: { assembly: OpeningAssemblyConfig }): React.JSX.Element {
  const { t } = useTranslation('config')
  const { updateOpeningAssemblyName, updateOpeningAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateOpeningAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<OpeningConfig>) => {
      updateOpeningAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, updateOpeningAssemblyConfig]
  )

  return (
    <div
      className="flex-col
      gap-3
      p-3
      "
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
      <div className="grid-cols-2 gap-2 gap-x-3 items-center">
        <div className="grid-cols-[auto_1fr] gap-x-2 items-center">
          <Label.Root>
            <span className="text-base font-medium text-gray-900">{t($ => $.common.name)}</span>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => {
              nameInput.handleChange(e.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.openings.placeholders.name)}
            size="2"
          />
        </div>

        <div className="gap-2 items-center">
          <Label.Root>
            <span className="text-base font-medium text-gray-900">{t($ => $.common.type)}</span>
          </Label.Root>
          <span className="text-base text-gray-900">{t($ => $.openings.types[assembly.type])}</span>
        </div>
      </div>

      <Separator size="4" />

      {/* Configuration Fields */}
      {assembly.type === 'simple' ? (
        <SimpleOpeningContent config={assembly} update={handleUpdateConfig} />
      ) : assembly.type === 'post' ? (
        <PostOpeningContent config={assembly} update={handleUpdateConfig} />
      ) : assembly.type === 'planked' ? (
        <PlankedOpeningContent config={assembly} update={handleUpdateConfig} />
      ) : (
        <>
          <Heading size="2">{t($ => $.openings.types.empty)}</Heading>
          <div className="grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.padding)}</span>
            </Label.Root>
            <LengthField
              value={assembly.padding}
              onChange={padding => {
                handleUpdateConfig({ padding })
              }}
              unit="mm"
            />
          </div>
        </>
      )}
    </div>
  )
}

const SimpleOpeningContent = ({
  config,
  update
}: {
  config: SimpleOpeningConfig
  update: (updates: Partial<SimpleOpeningConfig>) => void
}) => {
  const { t } = useTranslation('config')
  return (
    <div className="grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.padding)}</span>
      </Label.Root>
      <LengthField
        value={config.padding}
        onChange={padding => {
          update({ padding })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.headerThickness)}</span>
      </Label.Root>
      <LengthField
        value={config.headerThickness}
        onChange={headerThickness => {
          update({ headerThickness })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.headerMaterial)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.headerMaterial}
        onValueChange={headerMaterial => {
          if (!headerMaterial) return
          update({ headerMaterial })
        }}
        size="2"
        preferredTypes={['dimensional']}
      />

      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.sillThickness)}</span>
      </Label.Root>
      <LengthField
        value={config.sillThickness}
        onChange={sillThickness => {
          update({ sillThickness })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.sillMaterial)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.sillMaterial}
        onValueChange={sillMaterial => {
          if (!sillMaterial) return
          update({ sillMaterial })
        }}
        size="2"
        preferredTypes={['dimensional']}
      />
    </div>
  )
}

const PostOpeningContent = ({
  config,
  update
}: {
  config: PostOpeningConfig
  update: (updates: Partial<PostOpeningConfig>) => void
}) => {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <Heading size="2">{t($ => $.openings.sections.opening)}</Heading>
      <div className="grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.padding)}</span>
        </Label.Root>
        <LengthField
          value={config.padding}
          onChange={padding => {
            update({ padding })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.headerThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.headerThickness}
          onChange={headerThickness => {
            update({ headerThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.headerMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.headerMaterial}
          onValueChange={headerMaterial => {
            if (!headerMaterial) return
            update({ headerMaterial })
          }}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.sillThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.sillThickness}
          onChange={sillThickness => {
            update({ sillThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.sillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.sillMaterial}
          onValueChange={sillMaterial => {
            if (!sillMaterial) return
            update({ sillMaterial })
          }}
          size="2"
          preferredTypes={['dimensional']}
        />
      </div>

      <PostsConfigSection config={config} onUpdate={update} />
    </div>
  )
}

function PostsConfigSection({
  config,
  onUpdate
}: {
  config: PostOpeningConfig
  onUpdate: (update: Partial<PostOpeningConfig>) => void
}): React.JSX.Element {
  const { t } = useTranslation('config')
  const typeSelectId = useId()

  const posts = config.posts
  const updatePosts = (posts: PostConfig) => {
    onUpdate({ posts })
  }

  return (
    <div className="flex flex-col gap-3">
      <Heading size="2">{t($ => $.openings.sections.posts)}</Heading>

      <div className="grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root htmlFor={typeSelectId}>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.type)}</span>
        </Label.Root>
        <Select.Root
          value={posts.type}
          onValueChange={value => {
            if (value === 'full') {
              updatePosts({
                type: 'full',
                width: posts.width,
                material: posts.material
              })
            } else {
              updatePosts({
                type: 'double',
                width: posts.width,
                thickness: 'thickness' in posts ? posts.thickness : 120,
                infillMaterial: ('infillMaterial' in posts ? posts.infillMaterial : '') as MaterialId,
                material: posts.material
              })
            }
          }}
          size="2"
        >
          <Select.Trigger id={typeSelectId} />
          <Select.Content>
            <Select.Item value="full">{t($ => $.openings.postTypes.full)}</Select.Item>
            <Select.Item value="double">{t($ => $.openings.postTypes.double)}</Select.Item>
          </Select.Content>
        </Select.Root>

        <div className="col-span-2">
          <Label.Root>
            <div className="flex items-center gap-1">
              <Checkbox
                checked={config.replacePosts}
                onCheckedChange={value => {
                  onUpdate({ replacePosts: value === true })
                }}
              />
              <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.replacesWallPosts)}</span>
            </div>
          </Label.Root>
        </div>

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={posts.width}
          onChange={value => {
            updatePosts({ ...posts, width: value })
          }}
          unit="mm"
          size="2"
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.thickness)}</span>
            </Label.Root>
            <LengthField
              value={posts.thickness}
              onChange={value => {
                updatePosts({ ...posts, thickness: value })
              }}
              unit="mm"
              size="2"
            />
          </>
        )}

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={'material' in posts ? posts.material : undefined}
          onValueChange={material => {
            if (!material) return
            updatePosts({ ...posts, material })
          }}
          size="2"
          preferredTypes={['dimensional']}
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
            </Label.Root>
            <MaterialSelectWithEdit
              value={posts.infillMaterial}
              onValueChange={infillMaterial => {
                if (!infillMaterial) return
                updatePosts({ ...posts, infillMaterial })
              }}
              size="2"
            />
          </>
        )}

        <div className="col-span-2">
          <Label.Root>
            <div className="flex items-center gap-2">
              <span className="text-base font-medium text-gray-900">
                {t($ => $.openings.labels.postsHaveFullHeight)}
              </span>
              <Switch
                checked={config.postsSupportHeader}
                onCheckedChange={value => {
                  onUpdate({ postsSupportHeader: value })
                }}
              />
              <span className="text-base font-medium text-gray-900">
                {t($ => $.openings.labels.postsSupportHeader)}
              </span>
            </div>
          </Label.Root>
        </div>
      </div>
    </div>
  )
}

const PlankedOpeningContent = ({
  config,
  update
}: {
  config: PlankedOpeningConfig
  update: (updates: Partial<PlankedOpeningConfig>) => void
}) => {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <Heading size="2">{t($ => $.openings.sections.opening)}</Heading>
      <div className="grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.padding)}</span>
        </Label.Root>
        <div className="col-span-3">
          <LengthField
            value={config.padding}
            onChange={padding => {
              update({ padding })
            }}
            unit="mm"
          />
        </div>

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.headerThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.headerThickness}
          onChange={headerThickness => {
            update({ headerThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.headerMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.headerMaterial}
          onValueChange={headerMaterial => {
            if (!headerMaterial) return
            update({ headerMaterial })
          }}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.sillThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.sillThickness}
          onChange={sillThickness => {
            update({ sillThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.sillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.sillMaterial}
          onValueChange={sillMaterial => {
            if (!sillMaterial) return
            update({ sillMaterial })
          }}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.plankThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.plankThickness}
          onChange={plankThickness => {
            update({ plankThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.openings.labels.plankMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.plankMaterial}
          onValueChange={plankMaterial => {
            if (!plankMaterial) return
            update({ plankMaterial })
          }}
          size="2"
          preferredTypes={['dimensional']}
        />
      </div>
    </div>
  )
}
