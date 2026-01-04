import { InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Callout, Flex, Grid, IconButton, Kbd, SegmentedControl, Separator, Switch, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { PerimeterId, PerimeterWallId, WallPostId } from '@/building/model/ids'
import type { WallPostType } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { type MaterialId } from '@/construction/materials/material'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D, type Polygon2D, addVec2, offsetPolygon, scaleAddVec2, scaleVec2 } from '@/shared/geometry'

interface WallPostInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  postId: WallPostId
}

export function WallPostInspector({ perimeterId, wallId, postId }: WallPostInspectorProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  // Get model store functions
  const select = useSelectionStore()
  const { updatePerimeterWallPost: updatePost, removePerimeterWallPost: removePost } = useModelActions()

  // Get perimeter from store
  const perimeter = usePerimeterById(perimeterId)

  // Use useMemo to find wall and post within the wall object
  const wall = useMemo(() => {
    return perimeter?.walls.find(w => w.id === wallId)
  }, [perimeter, wallId])

  const post = useMemo(() => {
    return wall?.posts.find(p => p.id === postId)
  }, [wall, postId])

  const viewportActions = useViewportActions()

  // If post not found, show error
  if (!post || !wall || !perimeter || !perimeterId || !wallId) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">{t($ => $.wallPost.notFound)}</Text>
            <br />
            {t($ => $.wallPost.notFoundMessage, {
              id: postId
            })}
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (newType: WallPostType) => {
      updatePost(perimeterId, wallId, postId, { type: newType })
    },
    [updatePost, perimeterId, wallId, postId]
  )

  const handleReplacesPostsChange = useCallback(
    (replacesPosts: boolean) => {
      updatePost(perimeterId, wallId, postId, { replacesPosts: !replacesPosts })
    },
    [updatePost, perimeterId, wallId, postId]
  )

  const handleMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId) {
        updatePost(perimeterId, wallId, postId, { material: materialId })
      }
    },
    [updatePost, perimeterId, wallId, postId]
  )

  const handleInfillMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId != null) {
        updatePost(perimeterId, wallId, postId, { infillMaterial: materialId })
      }
    },
    [updatePost, perimeterId, wallId, postId]
  )

  const handleRemovePost = useCallback(() => {
    if (confirm(t($ => $.wallPost.confirmDelete))) {
      select.popSelection()
      removePost(perimeterId, wallId, postId)
    }
  }, [removePost, perimeterId, wallId, postId, select, t])

  const handleFitToView = useCallback(() => {
    if (!wall || !post) return

    // Calculate post polygon (same as WallPostShape.tsx)
    const insideStart = wall.insideLine.start
    const outsideStart = wall.outsideLine.start
    const wallVector = wall.direction
    const leftEdge = post.centerOffsetFromWallStart - post.width / 2
    const offsetStart = scaleVec2(wallVector, leftEdge)
    const offsetEnd = scaleAddVec2(offsetStart, wallVector, post.width)

    const insidePostStart = addVec2(insideStart, offsetStart)
    const insidePostEnd = addVec2(insideStart, offsetEnd)
    const outsidePostStart = addVec2(outsideStart, offsetStart)
    const outsidePostEnd = addVec2(outsideStart, offsetEnd)

    const postPolygon: Polygon2D = {
      points: [insidePostStart, insidePostEnd, outsidePostEnd, outsidePostStart]
    }

    // Expand the polygon by 1.5x on each side (3x total area)
    const expandAmount = Math.max(post.width, wall.thickness) * 1.5
    const expandedPolygon = offsetPolygon(postPolygon, expandAmount)

    // Calculate bounds from expanded polygon
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
          <SegmentedControl.Root value={post.type} onValueChange={handleTypeChange} size="1">
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
              updatePost(perimeterId, wallId, postId, { width: value })
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
              updatePost(perimeterId, wallId, postId, { thickness: value })
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
