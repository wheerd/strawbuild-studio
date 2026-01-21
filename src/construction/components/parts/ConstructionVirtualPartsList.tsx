import { EyeOpenIcon } from '@radix-ui/react-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table } from '@/components/ui/table'
import type { PartId, VirtualPartsList } from '@/construction/parts'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

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
      <Card variant="surface" className="w-full">
        <CardContent className="flex justify-center">
          <span className="text-muted-foreground text-lg">{t($ => $.modulesList.noModules)}</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="surface" className="w-full flex-1 grow">
      <CardHeader className="p-3">
        <h2 className="text-xl font-bold">{t($ => $.modulesList.title)}</h2>
      </CardHeader>
      <CardContent className="px-3">
        <Table.Root variant="surface" className="min-w-full">
          <Table.Header className="bg-muted">
            <Table.Row>
              <Table.ColumnHeaderCell width="5em" className="text-center">
                {t($ => $.modulesList.tableHeaders.label)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t($ => $.modulesList.tableHeaders.type)}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t($ => $.modulesList.tableHeaders.description)}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="20em">
                {t($ => $.modulesList.tableHeaders.dimensions)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="6em" className="text-center">
                {t($ => $.modulesList.tableHeaders.quantity)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="3em" className="text-center">
                {t($ => $.modulesList.tableHeaders.view)}
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {parts.map(part => (
              <Table.Row key={part.partId}>
                <Table.RowHeaderCell className="text-center">
                  <span className="font-medium">{part.label}</span>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <span>{part.type}</span>
                </Table.Cell>
                <Table.Cell>
                  <span>{useTranslatableString(part.description)}</span>
                </Table.Cell>
                <Table.Cell>
                  <span>{formatDimensions3D([part.size[0], part.size[1], part.size[2]])}</span>
                </Table.Cell>
                <Table.Cell className="text-center">
                  <span>{part.quantity}</span>
                </Table.Cell>
                <Table.Cell className="text-center">
                  {canHighlightPart(part.partId) && onViewInPlan && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        onViewInPlan(part.partId)
                      }}
                      title={t($ => $.modulesList.actions.viewInPlan)}
                      className="-my-2"
                    >
                      <EyeOpenIcon />
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </CardContent>
    </Card>
  )
}
