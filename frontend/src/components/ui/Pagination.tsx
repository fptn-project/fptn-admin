import React, { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
  className?: string
}

type PageItem = number | 'ellipsis'

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i)

const getPageItems = (
  current: number,
  total: number,
  siblingCount: number
): PageItem[] => {
  const totalPageNumbers = siblingCount * 2 + 5

  if (totalPageNumbers >= total) {
    return range(1, total)
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1)
  const rightSiblingIndex = Math.min(current + siblingCount, total)

  const shouldShowLeftDots = leftSiblingIndex > 2
  const shouldShowRightDots = rightSiblingIndex < total - 2

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftRange = range(1, 3 + siblingCount * 2)
    return [...leftRange, 'ellipsis', total]
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightRange = range(total - (3 + siblingCount * 2) + 1, total)
    return [1, 'ellipsis', ...rightRange]
  }

  return [
    1,
    'ellipsis',
    ...range(leftSiblingIndex, rightSiblingIndex),
    'ellipsis',
    total
  ]
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = ''
}: PaginationProps): ReactElement | null => {
  const { t } = useTranslation()
  if (totalPages <= 1) return null

  const items = getPageItems(currentPage, totalPages, siblingCount)

  return (
    <nav
      className={`flex items-center gap-1 ${className}`}
      aria-label={t('pagination.ariaLabel')}
    >
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={t('pagination.previousPage')}
        className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-8 min-w-8 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === currentPage ? 'page' : undefined}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors ${
              item === currentPage
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-foreground hover:bg-muted'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={t('pagination.nextPage')}
        className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}

export default Pagination
