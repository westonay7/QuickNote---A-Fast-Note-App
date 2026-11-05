import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/format'

/* ----------------------------- Button ----------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 dark:disabled:bg-brand-900/60',
  secondary:
    'border border-zinc-200 bg-white text-zinc-700 shadow-soft hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200 dark:hover:bg-white/5 dark:hover:text-white',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white',
  subtle:
    'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-950',
  danger:
    'bg-red-600 text-white shadow-soft hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[0.95rem] gap-2',
  icon: 'h-10 w-10 p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

/* ------------------------------ Field ----------------------------- */

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  htmlFor?: string
  children: ReactNode
}

export function Field({ label, hint, error, required, className, htmlFor, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[0.8rem] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && <p className="text-[0.8rem] text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  )
}

/* ------------------------------ Input ----------------------------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, icon, className, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 shadow-soft transition-colors',
          'placeholder:text-zinc-400 dark:bg-surface-dark dark:text-zinc-100 dark:placeholder:text-zinc-500',
          'focus:border-brand-400 focus:outline-2 focus:outline-brand-500/40',
          icon && 'pl-9',
          invalid
            ? 'border-red-400 focus:border-red-500 focus:outline-red-500/40'
            : 'border-zinc-200 dark:border-white/10',
          className,
        )}
        {...rest}
      />
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-soft transition-colors',
          'placeholder:text-zinc-400 dark:bg-surface-dark dark:text-zinc-100 dark:placeholder:text-zinc-500',
          'focus:border-brand-400 focus:outline-2 focus:outline-brand-500/40',
          invalid
            ? 'border-red-400 focus:border-red-500 focus:outline-red-500/40'
            : 'border-zinc-200 dark:border-white/10',
          className,
        )}
        {...rest}
      />
    )
  },
)

/* ------------------------------ Select ---------------------------- */

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2024%2024%27%20stroke%3D%27%2371717a%27%3E%3Cpath%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27m6%209%206%206%206-6%27%2F%3E%3C%2Fsvg%3E")] bg-[position:right_0.6rem_center] bg-[length:1.1rem] bg-no-repeat px-3 pr-9 text-sm text-zinc-900 shadow-soft transition-colors',
          'focus:border-brand-400 focus:outline-2 focus:outline-brand-500/40',
          'dark:border-white/10 dark:bg-surface-dark dark:bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2024%2024%27%20stroke%3D%27%23a1a1aa%27%3E%3Cpath%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27m6%209%206%206%206-6%27%2F%3E%3C%2Fsvg%3E")] dark:text-zinc-100',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    )
  },
)

/* ------------------------------ Switch ---------------------------- */

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  id?: string
}

export function Switch({ checked, onChange, label, description, disabled, id }: SwitchProps) {
  const switchId = id ?? `switch-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <label
          htmlFor={switchId}
          className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-[0.8rem] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      <button
        id={switchId}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
          checked ? 'bg-brand-600' : 'bg-zinc-300 dark:bg-zinc-600',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}

/* ------------------------------ Badge ----------------------------- */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ----------------------------- Spinner ---------------------------- */

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
      <Loader2 className={cn('h-5 w-5 animate-spin', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function CenterSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <Spinner label={label} />
    </div>
  )
}

/* ---------------------------- Skeleton ---------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-shimmer rounded-lg bg-zinc-200/80 dark:bg-white/10', className)}
    />
  )
}

export function NoteCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-5/6" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* --------------------------- EmptyState --------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  secondaryAction?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'card flex flex-col items-center justify-center rounded-2xl border-dashed text-center',
        compact ? 'px-6 py-10' : 'px-6 py-16',
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

/* ------------------------- SegmentedControl ----------------------- */

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 shadow-soft dark:border-white/10 dark:bg-surface-dark"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500',
            value === opt.value
              ? 'bg-brand-600 text-white shadow-soft'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
