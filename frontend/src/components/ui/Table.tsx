import React, {
  HTMLAttributes,
  ReactElement,
  TdHTMLAttributes,
  ThHTMLAttributes
} from 'react'

export const Table = ({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableElement>): ReactElement => (
  <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-left text-sm ${className}`} {...props} />
    </div>
  </div>
)

export const TableHeader = ({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement => (
  <thead className={`bg-muted/30 dark:bg-muted/10 ${className}`} {...props} />
)

export const TableBody = ({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement => (
  <tbody className={`divide-y divide-border ${className}`} {...props} />
)

export const TableRow = ({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableRowElement>): ReactElement => (
  <tr
    className={`transition-colors hover:bg-muted/30 dark:hover:bg-muted/10 ${className}`}
    {...props}
  />
)

export const TableHead = ({
  className = '',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>): ReactElement => (
  <th
    className={`whitespace-nowrap border-b border-border px-4 py-3 text-sm font-medium text-muted-foreground ${className}`}
    {...props}
  />
)

export const TableCell = ({
  className = '',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>): ReactElement => (
  <td className={`px-4 py-3 align-middle ${className}`} {...props} />
)
