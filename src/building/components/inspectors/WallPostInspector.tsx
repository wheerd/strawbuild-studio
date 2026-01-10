import { InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Callout, Flex, Grid, IconButton, Kbd, SegmentedControl, Separator, Switch, Text } from '@radix-ui/themes'
import { useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { WallPostType } from '@/building/model'
import type { WallPostId } from '@/building/model/ids'
import { useModelActions, usePerimeterWallById, useWallPostById } from '@/building/store'
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
    (newType: WallPostType) => {
      updatePost(postId, { postType: newType })
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
    <Flex direction="column" gap="4">
      {/* Basic Properties */}
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="2">
          <Text size="1" weight="medium" color="gray">
            {t($ => $.wallPost.type)}
          </Text>
          <SegmentedControl.Root value={post.postType} onValueChange={handleTypeChange} size="1">
            <SegmentedControl.Item value="inside">{t($ => $.wallPost.typeInside)}</SegmentedControl.Item>
            <SegmentedControl.Item value="center">{t($ => $.wallPost.typeCenter)}</SegmentedControl.Item>
            <SegmentedControl.Item value="outside">{t($ => $.wallPost.typeOutside)}</SegmentedControl.Item>
            <SegmentedControl.Item value="double">{t($ => $.wallPost.typeDouble)}</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>

        <Flex align="center" justify="between" gap="2">
          <Text size="1" weight="medium" color="gray">
            {t($ => $.wallPost.behavior)}
          </Text>
          <Flex align="center" gap="2">
            <Text size="1" color="gray">
              {t($ => $.wallPost.actsAsPost)}
            </Text>
            <Switch checked={!post.replacesPosts} size="1" onCheckedChange={handleReplacesPostsChange} />
            <Text size="1" color="gray">
              {t($ => $.wallPost.flankedByPosts)}
            </Text>
          </Flex>
        </Flex>

        {/* Dimension inputs in Radix Grid layout */}
        <Grid columns="auto 1fr auto 1fr" rows="1" gap="2" gapX="3" align="center" flexGrow="1">
          {/* Width Label */}
          <Label.Root htmlFor="post-width">
            <Text size="1" weight="medium" color="gray">
              {t($ => $.wallPost.width)}
            </Text>
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
            size="1"
            style={{ width: '80px' }}
          />

          {/* Thickness Label */}
          <Label.Root htmlFor="post-thickness">
            <Text size="1" weight="medium" color="gray">
              {t($ => $.wallPost.thickness)}
            </Text>
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
            size="1"
            style={{ width: '80px' }}
          />
        </Grid>
      </Flex>
      {/* Material Selection */}
      <Flex direction="column" gap="2">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.wallPost.postMaterial)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={post.material}
          onValueChange={handleMaterialChange}
          size="1"
          preferredTypes={['dimensional']}
        />
      </Flex>
      {/* Infill Material Selection */}
      <Flex direction="column" gap="2">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.wallPost.infillMaterial)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit value={post.infillMaterial} onValueChange={handleInfillMaterialChange} size="1" />
      </Flex>
      <Separator size="4" />
      {/* Action Buttons */}
      <Flex gap="2" justify="end">
        <IconButton size="2" title={t($ => $.wallPost.fitToView)} onClick={handleFitToView}>
          <FitToViewIcon />
        </IconButton>
        <IconButton size="2" color="red" title={t($ => $.wallPost.deletePost)} onClick={handleRemovePost}>
          <TrashIcon />
        </IconButton>
      </Flex>
      <Callout.Root color="blue">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="1">
            <Trans t={t} i18nKey={$ => $.wallPost.moveInstructions} components={{ kbd: <Kbd /> }}>
              To move the post, you can use the Move Tool{' '}
              <Kbd>
                <>{{ hotkey: 'M' }}</>
              </Kbd>{' '}
              or click any of the distance measurements shown in the editor to adjust them.
            </Trans>
          </Text>
        </Callout.Text>
      </Callout.Root>
    </Flex>
  )
}
