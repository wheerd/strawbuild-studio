import { EyeOpenIcon } from '@radix-ui/react-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { PartId, VirtualPartsList } from '@/construction/parts'
import { useFormatters } from '@/shared/i18n/useFormatters'

// Helper to check if part can be highlighted (not auto-generated)
const canHighlightPart = (partId: PartId): boolean => !partId.startsWith('auto_')

export function ConstructionVirtualPartsList({
  partsList,
  onViewInPlan
}: {
  partsList: VirtualPartsList
  onViewInPlan?: (partId: PartId) => void
}): React.JSX.Element {
  const { t } = useTranslation('construction')
  const { formatDimensions3D } = useFormatters()

  const parts = useMemo(() => Object.values(partsList).sort((a, b) => a.label.localeCompare(b.label)), [partsList])

  if (parts.length === 0) {
    return (
      <Card variant="soft" size="2">
        <div className="flex justify-center">
          <span className="text-lg text-gray-900">{t($ => $.modulesList.noModules)}</span>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="soft" size="2">
      <div className="flex flex-col gap-3">
        <h4>{t($ => $.modulesList.title)}</h4>
        <Table.Root variant="soft" size="2" className="min-w-full">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell width="5em" justify-center>
                {t($ => $.modulesList.tableHeaders.label)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t($ => $.modulesList.tableHeaders.type)}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="20em">
                {t($ => $.modulesList.tableHeaders.dimensions)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="6em" justify-center>
                {t($ => $.modulesList.tableHeaders.quantity)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="3em" justify-center>
                {t($ => $.modulesList.tableHeaders.view)}
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {parts.map(part => (
              <Table.Row key={part.partId}>
                <Table.RowHeaderCell justify-center>
                  <span className="font-medium">{part.label}</span>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <span>{part.type}</span>
                </Table.Cell>
                <Table.Cell>
                  <span>{formatDimensions3D([part.size[0], part.size[1], part.size[2]])}</span>
                </Table.Cell>
                <Table.Cell justify-center>
                  <span>{part.quantity}</span>
                </Table.Cell>
                <Table.Cell justify-center>
                  {canHighlightPart(part.partId) && onViewInPlan && (
                    <Button
                      size="icon"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onViewInPlan(part.partId)
                      }}
                      title={t($ => $.modulesList.actions.viewInPlan)}
                    >
                      <EyeOpenIcon />
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </Card>
  )
}
