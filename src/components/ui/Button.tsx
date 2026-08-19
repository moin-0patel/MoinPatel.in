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
  // Rests on accent-STRONG, not accent. --color-accent is the light TEXT tone
  // (#c3c0ff); the filled surface is --color-accent-strong (#4f46e5), which
  // carries white at 6.29:1, hovering to accent-deep at 7.99:1. The split is
  // Material 3's and it is why one value cannot do both jobs — see tokens.css.
  // The design fills the primary action with a gradient and an inset top
  // highlight rather than a flat colour. White is safe across the whole ramp:
  // 6.29:1 at accent-strong through 9.93:1 at the dark end.
  primary:
    'bg-gradient-to-br from-accent-strong to-accent-deep text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-110',
  secondary:
    'border border-strong bg-transparent text-primary hover:border-accent hover:text-accent',
  ghost: 'bg-transparent text-secondary hover:text-primary hover:bg-surface',
  danger: 'bg-danger text-white hover:brightness-110',
}

// RES-07: >= 44px touch targets. `sm` is 36px and is therefore desktop-only —
// on mobile the padding classes below lift it back to 44.
// `lg` carries no text-* class on purpose. `text-base` does NOT set a font
// size here: --color-base makes Tailwind compile it to `color:var(--color-base)`
// (see HeroSection). It was inert — overridden by `text-white` — and one
// reorder away from painting the label the page-background colour. Dropping it
// changes nothing visually: the body already sets font-size: var(--text-base).
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-11 md:h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-13 px-6',
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
  const isDisabled = disabled === true || loading

  const surface = cn(
    'relative inline-flex items-center justify-center gap-2 rounded-[--radius-md]',
    'font-medium whitespace-nowrap select-none',
    'transition-colors duration-[--duration-hover] ease-[--ease-out]',
    // 32.4: disabled is 45% opacity and never the only signal — the
    // aria-disabled below carries it for non-visual users.
    'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    className,
  )

  /*
   * `asChild` renders through Radix Slot, which merges these props onto the
   * caller's element — a <Link> or an <a>. It requires EXACTLY ONE React
   * element child, and it must be the caller's element.
   *
   * This branch exists because the shared render below cannot satisfy that.
   * It passes Slot two children (the label <span> and the `{loading && …}`
   * expression, which is `false` when not loading), and Slot throws:
   *
   *   Slot failed to slot onto its children.
   *   Expected a single React element child or `Slottable`.
   *
   * That crash blanked every page containing an `asChild` button — the
   * homepage, /404, /500 and the case study among them — and went unnoticed
   * from Phase 7 until the first browser run, because it is a runtime
   * invariant that tsc, ESLint and vite build cannot see.
   *
   * No loading treatment here: `asChild` is for navigation, and none of the
   * call sites passes `loading`. A spinner would also have to live INSIDE the
   * caller's element, which Slot has no way to arrange.
   */
  if (asChild) {
    return (
      <Slot ref={ref} aria-disabled={isDisabled || undefined} className={surface} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      className={surface}
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
    </button>
  )
})
