import { AlertCircle } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { controlClass } from '@/lib/fieldA11y'

/**
 * Form field primitives — PRD 32.4, A11Y-07.
 *
 * The wiring these exist to guarantee, because it is the part that gets
 * dropped when fields are hand-rolled per form:
 *
 *   - every control has a programmatically associated <label> (A11Y-07)
 *   - the hint and the error are linked via aria-describedby, both at once
 *     when both are present
 *   - `aria-invalid` marks the control, so a screen reader announces the
 *     error state and not only the error text
 *   - the error is never conveyed by red alone (A11Y-09) — it carries an icon
 *     and real text
 *
 * 32.4 also forbids placeholder-as-label: a placeholder disappears the moment
 * the user types, which leaves a filled form with unlabelled boxes.
 */

export function FormField({
  id,
  label,
  error,
  hint,
  required = false,
  counter,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  /** Rendered next to the label, e.g. the message character counter (18.1). */
  counter?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-secondary block text-sm font-medium">
          {label}
          {required && (
            <>
              <span aria-hidden="true" className="text-danger ml-0.5">
                *
              </span>
              <span className="visually-hidden"> (required)</span>
            </>
          )}
        </label>
        {counter}
      </div>

      {children}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted text-xs">
          {hint}
        </p>
      )}

      {/*
       * `role="alert"` so a validation failure is announced when it appears
       * (A11Y-12). The id is what aria-describedby on the control points at.
       */}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger flex items-start gap-1.5 text-xs">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClass, className)} {...props} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, 'resize-y', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(controlClass, 'pr-8', className)} {...props}>
        {children}
      </select>
    )
  },
)

/**
 * FR-CONT-08 honeypot.
 *
 * Off-screen, NOT `display: none`. A hidden-by-display field is trivially
 * detected and skipped by any bot worth defending against; a field that is
 * present, focusable-by-nothing and visually off-screen is not. `tabindex=-1`
 * and `aria-hidden` keep it away from real users in both modalities, and
 * `autocomplete="off"` stops a password manager filling it and locking a
 * genuine visitor out of the form.
 */
export const HoneypotField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function HoneypotField(props, ref) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
      <label htmlFor="website">Leave this field empty</label>
      <input ref={ref} id="website" type="text" tabIndex={-1} autoComplete="off" {...props} />
    </div>
  )
})
