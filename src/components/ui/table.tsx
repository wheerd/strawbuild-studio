import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const tableVariants = cva('w-full caption-bottom text-sm', {
  variants: {
    variant: {
      ghost: '',
      surface: 'border rounded-lg'
    },
    size: {
      '1': 'text-xs [&_th]:h-8 [&_th]:px-2 [&_td]:p-2',
      '2': 'text-sm [&_th]:h-10 [&_th]:px-3 [&_td]:p-3',
      '3': 'text-base [&_th]:h-12 [&_th]:px-4 [&_td]:p-4'
    }
  },
  defaultVariants: {
    variant: 'ghost',
    size: '2'
  }
})

interface TableProps extends React.HTMLAttributes<HTMLTableElement>, VariantProps<typeof tableVariants> {}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, variant, size, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={cn(tableVariants({ variant, size }), className)} {...props} />
  </div>
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
)
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)} {...props} />
  )
)
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

type JustifyValue = 'start' | 'center' | 'end'

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  justify?: JustifyValue
  width?: string
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, justify, width, style, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        justify === 'center' && 'text-center',
        justify === 'end' && 'text-right',
        className
      )}
      style={{ ...style, width }}
      {...props}
    />
  )
)
TableHead.displayName = 'TableHead'

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  justify?: JustifyValue
  width?: string
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, justify, width, style, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'p-4 align-middle [&:has([role=checkbox])]:pr-0',
        justify === 'center' && 'text-center',
        justify === 'end' && 'text-right',
        className
      )}
      style={{ ...style, width }}
      {...props}
    />
  )
)
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
  )
)
TableCaption.displayName = 'TableCaption'

// Compound component for Radix Themes compatibility
const TableCompound = Object.assign(Table, {
  Root: Table,
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Cell: TableCell,
  ColumnHeaderCell: TableHead,
  RowHeaderCell: TableHead,
  Caption: TableCaption
})

export {
  TableCompound as Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
}
