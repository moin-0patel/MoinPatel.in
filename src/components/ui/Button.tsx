import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Button — PRD 32.4.
 *
 * Visual and loading/disabled states only. No data access, no business rules
 * (FE-04). `asChild` lets a router <Link> take the button's appearance without
 * nesting an <a> inside a <button>, which is invalid and breaks keyboard
 * activation.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary:
    'border border-strong bg-transparent text-primary hover:border-accent hover:text-accent',
  ghost: 'bg-transparent text-secondary hover:text-primary hover:bg-surface',
  danger: 'bg-danger text-white hover:brightness-110',
}

// RES-07: >= 44px touch targets. `sm` is 36px and is therefore desktop-only —
// on mobile the padding classes below lift it back to 44.
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-11 md:h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-13 px-6 text-base',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  asChild?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    asChild = false,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : 'button'
  const isDisabled = disabled === true || loading

  return (
    <Component
      ref={ref}
      // A Slot child owns its own element type, so `type` would land on an <a>.
      {...(asChild ? {} : { type: props.type ?? 'button' })}
      disabled={asChild ? undefined : isDisabled}
      // Slot renders an anchor; `disabled` means nothing there, so the state
      // is communicated to assistive tech explicitly.
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-[--radius-md]',
        'font-medium whitespace-nowrap select-none',
        'transition-colors duration-[--duration-hover] ease-[--ease-out]',
        // 32.4: disabled is 45% opacity and never the only signal — the
        // aria-disabled above carries it for non-visual users.
        'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {/*
       * 32.4: "Loading = spinner replaces the label, width preserved." The
       * label stays in the DOM at zero opacity so the button does not resize
       * mid-interaction and shift everything around it (PERF-03).
       */}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="visually-hidden">Working…</span>
        </span>
      )}
    </Component>
  )
})
