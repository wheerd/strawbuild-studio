import { RotateCw, Trash } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { WallNodeId } from '@/building/model/ids'
import { getInnerWallConstructionOptions } from '@/building/model/wallNodeConstruction'
import { useModelActions, useWallNodeById } from '@/building/store'
import { useViewportActions } from '@/editor/canvas/state/viewportStore'
import { Bounds2D } from '@/shared/geometry'
import { Button } from '@/shared/ui/components/button'
import { FitToViewIcon } from '@/shared/ui/icons'

export function WallNodeInspector({ nodeId }: { nodeId: WallNodeId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const node = useWallNodeById(nodeId)
  const { removeWallNode, updateInnerWallNodeConstruction } = useModelActions()
  const { fitToView } = useViewportActions()

  const constructionOptions = useMemo(
    () => (node.type === 'inner' ? getInnerWallConstructionOptions(node) : []),
    [node]
  )

  const currentConstructionIndex = useMemo(
    () =>
      constructionOptions.findIndex(
        option =>
          node.type === 'inner' &&
          option.constructedBy === node.constructedBy &&
          option.constructedWithColinear === node.constructedWithColinear
      ),
    [constructionOptions, node]
  )

  const handleFitToView = useCallback(() => {
    const bounds = Bounds2D.fromPoints(node.boundary?.points ?? [node.center])
    fitToView(bounds)
  }, [node, fitToView])

  const handleDelete = useCallback(() => {
    removeWallNode(nodeId)
  }, [removeWallNode, nodeId])

  const handleCycleConstruction = useCallback(() => {
    if (node.type !== 'inner' || constructionOptions.length < 2) return
    const nextIndex = (currentConstructionIndex + 1 + constructionOptions.length) % constructionOptions.length
    const nextOption = constructionOptions[nextIndex]
    updateInnerWallNodeConstruction(nodeId, nextOption.constructedBy, nextOption.constructedWithColinear)
  }, [constructionOptions, currentConstructionIndex, node, nodeId, updateInnerWallNodeConstruction])

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        <div className="flex justify-end gap-2">
          {node.type === 'inner' && constructionOptions.length > 1 && (
            <Button size="icon" title={t($ => $.wallNode.switchConstruction)} onClick={handleCycleConstruction}>
              <RotateCw />
            </Button>
          )}
          <Button size="icon" title={t($ => $.wallNode.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </Button>
          <Button size="icon" variant="destructive" title={t($ => $.wallNode.deleteNode)} onClick={handleDelete}>
            <Trash />
          </Button>
        </div>
      </div>
    </div>
  )
}
