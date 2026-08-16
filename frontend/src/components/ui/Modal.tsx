import React, { ReactElement, ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: ReactNode
}

const Modal = ({
  open,
  onClose,
  title,
  children
}: ModalProps): ReactElement | null => {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  )
}

export default Modal
