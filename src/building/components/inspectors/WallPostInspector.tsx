import { InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { WallPostType } from '@/building/model'
import type { WallPostId } from '@/building/model/ids'
import { useModelActions, usePerimeterWallById, useWallPostById } from '@/building/store'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { type MaterialId } from '@/construction/materials/material'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D, offsetPolygon } from '@/shared/geometry'

export function WallPostInspector({ postId }: { postId: WallPostId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  // Get model store functions
  const select = useSelectionStore()
  const { updateWallPost: updatePost, removeWallPost: removePost } = useModelActions()

  // Get perimeter from store
  const post = useWallPostById(postId)
  const wall = usePerimeterWallById(post.wallId)

  const viewportActions = useViewportActions()

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (newType: WallPostType | '') => {
      if (newType) {
        updatePost(postId, { postType: newType })
      }
    },
    [updatePost, postId]
  )

  const handleReplacesPostsChange = useCallback(
    (replacesPosts: boolean) => {
      updatePost(postId, { replacesPosts: !replacesPosts })
    },
    [updatePost, postId]
  )

  const handleMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId) {
        updatePost(postId, { material: materialId })
      }
    },
    [updatePost, postId]
  )

  const handleInfillMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId != null) {
        updatePost(postId, { infillMaterial: materialId })
      }
    },
    [updatePost, postId]
  )

  const handleRemovePost = useCallback(() => {
    if (confirm(t($ => $.wallPost.confirmDelete))) {
      select.popSelection()
      removePost(postId)
    }
  }, [removePost, postId, select, t])

  const handleFitToView = useCallback(() => {
    const expandAmount = Math.max(post.width, wall.thickness) * 1.5
    const expandedPolygon = offsetPolygon(post.polygon, expandAmount)
    const bounds = Bounds2D.fromPoints(expandedPolygon.points)
    viewportActions.fitToView(bounds)
  }, [wall, post, viewportActions])

  return (
    <div className="flex flex-col gap-4">
      {/* Basic Properties */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">{t($ => $.wallPost.type)}</span>
          <ToggleGroup type="single" variant="outline" value={post.postType} onValueChange={handleTypeChange} size="sm">
            <ToggleGroupItem value="inside">{t($ => $.wallPost.typeInside)}</ToggleGroupItem>
            <ToggleGroupItem value="center">{t($ => $.wallPost.typeCenter)}</ToggleGroupItem>
            <ToggleGroupItem value="outside">{t($ => $.wallPost.typeOutside)}</ToggleGroupItem>
            <ToggleGroupItem value="double">{t($ => $.wallPost.typeDouble)}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">{t($ => $.wallPost.behavior)}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">{t($ => $.wallPost.actsAsPost)}</span>
            <Switch checked={!post.replacesPosts} size="sm" onCheckedChange={handleReplacesPostsChange} />
            <span className="text-sm text-gray-900">{t($ => $.wallPost.flankedByPosts)}</span>
          </div>
        </div>

        {/* Dimension inputs in Radix Grid layout */}
        <div className="grid grow grid-cols-[auto_1fr_auto_1fr] grid-rows-1 items-center gap-2 gap-x-3">
          {/* Width Label */}
          <Label.Root htmlFor="post-width">
            <span className="text-sm font-medium text-gray-900">{t($ => $.wallPost.width)}</span>
          </Label.Root>

          {/* Width Input */}
          <LengthField
            value={post.width}
            onCommit={value => {
              updatePost(postId, { width: value })
            }}
            unit="cm"
            min={10}
            max={500}
            step={10}
            size="sm"
            style={{ width: '80px' }}
          />

          {/* Thickness Label */}
          <Label.Root htmlFor="post-thickness">
            <span className="text-sm font-medium text-gray-900">{t($ => $.wallPost.thickness)}</span>
          </Label.Root>

          {/* Thickness Input */}
          <LengthField
            value={post.thickness}
            onCommit={value => {
              updatePost(postId, { thickness: value })
            }}
            unit="cm"
            min={50}
            max={1000}
            step={10}
            size="sm"
            style={{ width: '80px' }}
          />
        </div>
      </div>
      {/* Material Selection */}
      <div className="flex flex-col gap-2">
        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.wallPost.postMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={post.material}
          onValueChange={handleMaterialChange}
          size="sm"
          preferredTypes={['dimensional']}
        />
      </div>
      {/* Infill Material Selection */}
      <div className="flex flex-col gap-2">
        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.wallPost.infillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit value={post.infillMaterial} onValueChange={handleInfillMaterialChange} size="sm" />
      </div>
      <Separator />
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button size="icon" title={t($ => $.wallPost.fitToView)} onClick={handleFitToView}>
          <FitToViewIcon />
        </Button>
        <Button size="icon" variant="destructive" title={t($ => $.wallPost.deletePost)} onClick={handleRemovePost}>
          <TrashIcon />
        </Button>
      </div>
      <Callout color="blue">
        <CalloutIcon>
          <InfoCircledIcon />
        </CalloutIcon>
        <CalloutText>
          <span className="text-sm">
            <Trans t={t} i18nKey={$ => $.wallPost.moveInstructions} components={{ kbd: <Kbd /> }}>
              To move the post, you can use the Move Tool{' '}
              <Kbd>
                <>{{ hotkey: 'M' }}</>
              </Kbd>{' '}
              or click any of the distance measurements shown in the editor to adjust them.
            </Trans>
          </span>
        </CalloutText>
      </Callout>
    </div>
  )
}
