import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Add server" />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and children when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Add server">
        <p>form goes here</p>
      </Modal>
    )

    expect(screen.getByText('Add server')).toBeInTheDocument()
    expect(screen.getByText('form goes here')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Add server" />)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Add server" />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks page scroll while open and restores it on close', () => {
    document.body.style.overflow = 'visible'
    const { rerender } = render(
      <Modal open onClose={vi.fn()} title="Add server" />
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(<Modal open={false} onClose={vi.fn()} title="Add server" />)

    expect(document.body.style.overflow).toBe('visible')
  })
})
