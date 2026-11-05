import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button } from './ui'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/** Accessible dialog: focus trap, Esc to close, scroll lock, labelled title. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const node = ref.current

    const getFocusable = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
    const first = getFocusable()[0]
    ;(first ?? node)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = getFocusable()
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-t-2xl border border-zinc-200 bg-white shadow-pop animate-slide-up',
          'dark:border-white/10 dark:bg-surface-dark',
          'max-h-[90vh] overflow-y-auto scroll-area sm:rounded-2xl',
          sizes[size],
        )}
      >
        <div className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {children && <div className="px-5 py-3 sm:px-6">{children}</div>}
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4 sm:px-6 dark:border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------- ConfirmDialog -------------------------- */

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => void onConfirm()} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 pb-2">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            danger
              ? 'bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-400'
              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400',
          )}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{message}</div>
      </div>
    </Modal>
  )
}
