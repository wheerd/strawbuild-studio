import { CopyIcon, PlusIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React, { useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout, CalloutText } from '@/components/ui/callout'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { TextField } from '@/components/ui/text-field'
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
      <div className="flex w-full flex-col gap-4">
        <Callout className="text-muted-foreground">
          <CalloutText>{t($ => $.openings.emptyList)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Selector + Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex grow flex-col gap-1">
            <OpeningAssemblySelect
              value={(selectedAssemblyId as OpeningAssemblyId | null) ?? undefined}
              onValueChange={value => {
                setSelectedAssemblyId(value ?? null)
              }}
              showDefaultIndicator
            />
          </div>

          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button size="icon" title={t($ => $.common.addNew)}>
                <PlusIcon />
              </Button>
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
          </DropdownMenu>

          <Button size="icon" onClick={handleDuplicate} variant="soft" title={t($ => $.common.duplicate)}>
            <CopyIcon />
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                size="icon"
                variant="destructive"
                disabled={usage.isUsed}
                title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
              >
                <TrashIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.openings.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.openings.deleteConfirm, { name: selectedAssembly.name })}
              </AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-3">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="destructive" onClick={handleDelete}>
                    {t($ => $.common.delete)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                size="icon"
                className="text-destructive"
                variant="outline"
                title={t($ => $.common.resetToDefaults)}
              >
                <ResetIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.openings.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.openings.resetConfirm)}</AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-3">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="destructive" onClick={handleReset}>
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
      <Separator />
      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.defaultOpeningAssembly)}</span>
        </Label.Root>
        <OpeningAssemblySelect
          value={defaultId}
          onValueChange={assemblyId => {
            if (assemblyId) setDefaultOpeningAssembly(assemblyId)
          }}
          placeholder={t($ => $.common.placeholders.selectDefault)}
        />
      </div>
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </div>
  )
}

function UsageBadge({ id }: { id: EntityId }) {
  const label = useEntityLabel(id)
  return (
    <Badge key={id} variant="soft">
      {label}
    </Badge>
  )
}

function UsageDisplay({ usage }: { usage: OpeningAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex flex-wrap gap-1">
        {usage.isDefault && (
          <Badge variant="soft" color="blue">
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
    <Card className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-2 items-center gap-2 gap-x-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.name)}</span>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => {
              nameInput.handleChange(e.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.openings.placeholders.name)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.type)}</span>
          </Label.Root>
          <span className="text-base">{t($ => $.openings.types[assembly.type])}</span>
        </div>
      </div>

      <Separator />

      {/* Configuration Fields */}
      {assembly.type === 'simple' ? (
        <SimpleOpeningContent config={assembly} update={handleUpdateConfig} />
      ) : assembly.type === 'post' ? (
        <PostOpeningContent config={assembly} update={handleUpdateConfig} />
      ) : assembly.type === 'planked' ? (
        <PlankedOpeningContent config={assembly} update={handleUpdateConfig} />
      ) : (
        <>
          <h2 className="text-lg font-semibold">{t($ => $.openings.types.empty)}</h2>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
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
    </Card>
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
    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
      </Label.Root>
      <LengthField
        value={config.padding}
        onChange={padding => {
          update({ padding })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.headerThickness)}</span>
      </Label.Root>
      <LengthField
        value={config.headerThickness}
        onChange={headerThickness => {
          update({ headerThickness })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.headerMaterial)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.headerMaterial}
        onValueChange={headerMaterial => {
          if (!headerMaterial) return
          update({ headerMaterial })
        }}
        preferredTypes={['dimensional']}
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.sillThickness)}</span>
      </Label.Root>
      <LengthField
        value={config.sillThickness}
        onChange={sillThickness => {
          update({ sillThickness })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.sillMaterial)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.sillMaterial}
        onValueChange={sillMaterial => {
          if (!sillMaterial) return
          update({ sillMaterial })
        }}
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
      <h2 className="text-lg font-semibold">{t($ => $.openings.sections.opening)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
        </Label.Root>
        <LengthField
          value={config.padding}
          onChange={padding => {
            update({ padding })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.headerThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.headerThickness}
          onChange={headerThickness => {
            update({ headerThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.headerMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.headerMaterial}
          onValueChange={headerMaterial => {
            if (!headerMaterial) return
            update({ headerMaterial })
          }}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.sillThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.sillThickness}
          onChange={sillThickness => {
            update({ sillThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.sillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.sillMaterial}
          onValueChange={sillMaterial => {
            if (!sillMaterial) return
            update({ sillMaterial })
          }}
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
      <h2 className="text-lg font-semibold">{t($ => $.openings.sections.posts)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root htmlFor={typeSelectId}>
          <span className="text-base font-medium">{t($ => $.common.type)}</span>
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
              <span className="text-base font-medium">{t($ => $.openings.labels.replacesWallPosts)}</span>
            </div>
          </Label.Root>
        </div>

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={posts.width}
          onChange={value => {
            updatePosts({ ...posts, width: value })
          }}
          unit="mm"
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
            </Label.Root>
            <LengthField
              value={posts.thickness}
              onChange={value => {
                updatePosts({ ...posts, thickness: value })
              }}
              unit="mm"
            />
          </>
        )}

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={'material' in posts ? posts.material : undefined}
          onValueChange={material => {
            if (!material) return
            updatePosts({ ...posts, material })
          }}
          preferredTypes={['dimensional']}
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
            </Label.Root>
            <MaterialSelectWithEdit
              value={posts.infillMaterial}
              onValueChange={infillMaterial => {
                if (!infillMaterial) return
                updatePosts({ ...posts, infillMaterial })
              }}
            />
          </>
        )}

        <div className="col-span-2">
          <Label.Root>
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">{t($ => $.openings.labels.postsHaveFullHeight)}</span>
              <Switch
                checked={config.postsSupportHeader}
                onCheckedChange={value => {
                  onUpdate({ postsSupportHeader: value })
                }}
              />
              <span className="text-base font-medium">{t($ => $.openings.labels.postsSupportHeader)}</span>
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
      <h2 className="text-lg font-semibold">{t($ => $.openings.sections.opening)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
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
          <span className="text-base font-medium">{t($ => $.openings.labels.headerThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.headerThickness}
          onChange={headerThickness => {
            update({ headerThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.headerMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.headerMaterial}
          onValueChange={headerMaterial => {
            if (!headerMaterial) return
            update({ headerMaterial })
          }}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.sillThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.sillThickness}
          onChange={sillThickness => {
            update({ sillThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.sillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.sillMaterial}
          onValueChange={sillMaterial => {
            if (!sillMaterial) return
            update({ sillMaterial })
          }}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.plankThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.plankThickness}
          onChange={plankThickness => {
            update({ plankThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.plankMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.plankMaterial}
          onValueChange={plankMaterial => {
            if (!plankMaterial) return
            update({ plankMaterial })
          }}
          preferredTypes={['dimensional']}
        />
      </div>
    </div>
  )
}
