import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PingBadge } from './Servers'

describe('PingBadge', () => {
  it('is green under 200ms', () => {
    render(<PingBadge ping={199} />)
    expect(screen.getByText('199 ms')).toHaveClass('text-success')
  })

  it('is yellow between 200ms and 600ms', () => {
    render(<PingBadge ping={200} />)
    expect(screen.getByText('200 ms')).toHaveClass('text-warning')

    render(<PingBadge ping={600} />)
    expect(screen.getByText('600 ms')).toHaveClass('text-warning')
  })

  it('is red above 600ms', () => {
    render(<PingBadge ping={601} />)
    expect(screen.getByText('601 ms')).toHaveClass('text-destructive')
  })

  it('shows "Unreachable" in red for a failed check', () => {
    render(<PingBadge ping={-1} />)
    expect(screen.getByText('Unreachable')).toHaveClass('text-destructive')
  })
})
