import { EyeOpenIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import type { AggregatedPartItem, PartId } from '@/construction/parts/types'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

import { canHighlightPart } from './utils'

export default function GenericPartsTable({
  parts,
  onViewInPlan
}: {
  parts: AggregatedPartItem[]
  onViewInPlan?: (partId: PartId) => void
}) {
  const { t } = useTranslation('construction')
  return (
    <Table.Root variant="surface" className="min-w-full">
      <Table.Header className="bg-muted">
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.partsList.tableHeaders.label)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">{t($ => $.partsList.tableHeaders.type)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>{t($ => $.partsList.tableHeaders.description)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.partsList.tableHeaders.quantity)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" className="text-center">
            {t($ => $.partsList.tableHeaders.view)}
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <Table.Row key={part.partId}>
            <Table.RowHeaderCell className="text-center">
              <span className="font-medium">{part.label}</span>
            </Table.RowHeaderCell>
            <Table.Cell>{part.type}</Table.Cell>
            <Table.Cell>{useTranslatableString(part.description)}</Table.Cell>
            <Table.Cell className="text-center">{part.quantity}</Table.Cell>
            <Table.Cell className="text-center">
              {canHighlightPart(part.partId) && onViewInPlan && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onViewInPlan(part.partId)
                  }}
                  title={t($ => $.partsList.actions.viewInPlan)}
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
  )
}
