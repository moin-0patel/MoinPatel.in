import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { type RefObject } from 'react'
import { NavLink } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/**
 * The open state of the FR-NAV-02 mobile sheet — PRD 9.3, 12.1, RES-01, A11Y-11.
 *
 * WHY THIS IS A SEPARATE, LAZILY-IMPORTED FILE
 *
 * Radix Dialog costs roughly 12 KB gzipped. Importing it from PublicLayout —
 * which every public route renders eagerly — promoted it out of the lazy admin
 * and case-study chunks and into the public entry chunk, taking initial JS from
 * ~176 KB to 183.71 KB and breaking the 180 KB PERF-05 budget. Measured, not
 * estimated.
 *
 * Splitting the panel out means the trigger button ships in the entry chunk
 * (a few bytes of plain HTML) and Radix is fetched only when someone actually
 * opens the menu — which never happens at all on desktop.
 *
 * Radix still provides the parts that are genuinely hard: the focus trap, Esc,
 * backdrop dismissal, body scroll lock, `role="dialog"` + `aria-modal`, and
 * returning focus to whatever was focused before it opened — which is the
 * trigger, because that is what the user clicked. Only `aria-expanded` and
 * `aria-controls` move to the caller, and both are derived from the same
 * `open` state that drives this component, so they cannot disagree with it.
 */

export type MobileNavItem = { readonly to: string; readonly label: string }

export default function MobileNavPanel({
  id,
  open,
  onOpenChange,
  items,
  triggerRef,
}: {
  /** Matches the trigger's `aria-controls`. */
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly MobileNavItem[]
  /** Focus target on close — see `onCloseAutoFocus` below. */
  triggerRef: RefObject<HTMLButtonElement | null>
}) {
  const close = () => onOpenChange(false)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* `mobile-scrim` / `mobile-sheet` carry the open/close keyframes in
            globals.css, driven by the `data-state` Radix already stamps here.
            Radix holds both nodes mounted until the exit animation ends, so
            the close is animated rather than cut. Presentation only — the
            focus trap, Esc, scroll lock and focus restoration below are
            untouched. */}
        <Dialog.Overlay className="bg-base/80 mobile-scrim fixed inset-0 z-50 backdrop-blur-sm md:hidden" />

        <Dialog.Content
          id={id}
          // RES-01 — a full-screen sheet, not a squeezed horizontal bar.
          className="bg-base mobile-sheet fixed inset-0 z-50 flex flex-col md:hidden"
          // No description element exists; this silences Radix's dev warning
          // rather than pointing aria-describedby at nothing.
          aria-describedby={undefined}
          /*
           * A11Y-11 / WCAG 2.4.3 — return focus to the hamburger on close.
           *
           * Radix does NOT do this for us here. `DialogContentModal` hard-codes:
           *
           *   onCloseAutoFocus={(event) => {
           *     event.preventDefault()
           *     context.triggerRef.current?.focus()
           *   }}
           *
           * The `preventDefault()` cancels the browser/FocusScope restore to
           * whatever was focused before opening, and Radix then focuses its own
           * `Dialog.Trigger`. We do not render one — the button lives in
           * PublicLayout, on the other side of the lazy import that keeps Radix
           * out of the entry chunk (PERF-05) — so `triggerRef.current` is null,
           * nothing is focused, and focus falls back to <body>.
           *
           * The effect: after Esc, a keyboard user's next Tab restarts from the
           * top of the document instead of continuing from the menu button.
           * Measured in Chrome, on both the mouse and keyboard paths.
           *
           * Composing our own handler wins because Radix's runs first and ours
           * runs after, so this focus() is the last one to take effect.
           */
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            triggerRef.current?.focus()
          }}
        >
          {/* 64px, matching the page header this sheet opens over — the two
              rows must stay the same height or the close button lands at a
              different y than the hamburger that opened it. Corrected in the
              same pass that took the page header out of flow; see the long
              note in PublicLayout's Header. */}
          <div className="container-page flex h-(--header-height) shrink-0 items-center justify-between">
            {/* A11Y-11 — the dialog is labelled by its heading. */}
            <Dialog.Title className="text-muted font-mono text-xs tracking-[0.18em] uppercase">
              Menu
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-secondary hover:text-primary -mr-2 grid size-11 place-items-center rounded-(--radius-sm)"
                aria-label="Close navigation menu"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/*
           * Labelled "Mobile" rather than "Primary" so it never collides with
           * the desktop nav's landmark name — that one stays in the DOM,
           * hidden by CSS.
           *
           * `overflow-y-auto` on this region alone: the links scroll if they
           * outgrow the viewport, while the CTA below stays pinned.
           */}
          <nav aria-label="Mobile" className="container-page min-h-0 flex-1 overflow-y-auto py-4">
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    // Closing on click, not on a route change: clicking the
                    // link for the page you are already on does not change the
                    // pathname, and the sheet would stay open over it.
                    onClick={close}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-12 items-center rounded-(--radius-sm) px-3 text-lg',
                        'transition-colors duration-(--duration-hover) ease-(--ease-out)',
                        isActive
                          ? 'bg-accent-soft text-accent'
                          : 'text-secondary hover:text-primary',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/*
           * 9.3 / RES-01 — "primary CTA pinned at the bottom of the sheet".
           * `shrink-0` keeps it pinned while the link list scrolls; the
           * safe-area padding keeps it clear of an iOS home indicator.
           */}
          <div className="container-page border-subtle shrink-0 border-t py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button size="lg" className="w-full" asChild>
              <NavLink to="/contact" onClick={close}>
                Let&rsquo;s Talk
              </NavLink>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
