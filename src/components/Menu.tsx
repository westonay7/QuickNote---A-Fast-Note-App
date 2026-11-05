import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { cn } from '@/lib/format'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

interface MenuProps {
  /** Render prop for the trigger; spread the props onto a button. */
  trigger: (props: {
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
    onClick: () => void
    ref: Ref<HTMLButtonElement>
  }) => ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  label?: string
}

/** Lightweight accessible dropdown menu (Esc closes, arrows move, click-outside closes). */
export function Menu({ trigger, items, align = 'right', label = 'Menu' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    const first = listRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
    first?.focus()
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const move = (dir: 1 | -1) => {
    const nodes = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    )
    if (!nodes.length) return
    const idx = nodes.indexOf(document.activeElement as HTMLElement)
    nodes[(idx + dir + nodes.length) % nodes.length]?.focus()
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      {trigger({
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        onClick: () => setOpen((v) => !v),
        ref: triggerRef,
      })}
      {open && (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          id={menuId}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              move(1)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              move(-1)
            }
          }}
          className={cn(
            'absolute z-50 mt-1.5 min-w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-pop animate-scale-in',
            'dark:border-white/10 dark:bg-surface-raised-dark',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
                item.danger
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/5',
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
