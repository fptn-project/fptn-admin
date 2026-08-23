import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('lists every page when they all fit without ellipsis', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)

    for (const page of [1, 2, 3, 4, 5]) {
      expect(
        screen.getByRole('button', { name: String(page) })
      ).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('collapses distant pages into an ellipsis', () => {
    render(
      <Pagination currentPage={1} totalPages={20} onPageChange={vi.fn()} />
    )

    expect(screen.getByText('…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '10' })).not.toBeInTheDocument()
  })

  it('disables Previous on the first page and Next on the last page', () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
  })

  it('calls onPageChange with the target page when a page number is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    )

    await user.click(screen.getByRole('button', { name: '3' }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('steps forward and backward via the arrow buttons', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
    )

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(screen.getByRole('button', { name: 'Previous page' }))

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1)
  })
})
