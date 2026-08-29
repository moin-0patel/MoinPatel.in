import { createElement, forwardRef, type ElementType, type HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * Card — the panel surface, PRD 32.3/32.4.
 *
 * WHY THIS EXISTS
 *
 * It is not a new design. It is the class list that was already being used,
 * pasted by hand into eight places:
 *
 *   CapabilitiesSection, EducationSection, ExperienceSection, WhatIBuildSection,
 *   ProjectCard, ContactPage, ProjectDetailPage (x2)
 *
 * Every one of them read
 *
 *   rim-light border-subtle bg-surface hover:border-accent/40
 *   transition-colors duration-(--duration-hover) ease-(--ease-out)
 *   rounded-(--radius-lg) border p-5
 *
 * with small drift between copies — ProjectCard also carried
 * `hover:shadow-[--shadow-raised]` and a second, duplicate `transition-colors`;
 * CapabilitiesSection had dropped the transition entirely, so its border
 * changed instantly on hover while its neighbours eased. Nobody chose that.
 *
 * A restyle of a pasted class list is an eight-file edit that has to be got
 * right eight times. That is the actual reason this is a component.
 *
 * WHAT CHANGED IN THE MOVE
 *
 * Three things, each a leftover from the dark palette rather than a preference:
 *
 *   `rim-light` -> `panel-edge`. A 16% WHITE gradient stroke is a lit edge for
 *   a near-black card; on cream it is a milky film. See globals.css.
 *
 *   `hover:shadow-[--shadow-raised]` is gone. The shadow was
 *   `0 8px 24px -8px rgb(0 0 0 / .5)`, tuned for #08090c, and the reference has
 *   no drop shadow anywhere in its section content.
 *
 *   `hover:border-accent/40` -> `hover:border-strong`. `--color-accent` is now
 *   the DARK cyan used as text, so a 40% tint of it on a cream card was a
 *   muddy blue-grey rather than an accent. `--color-strong` is the token that
 *   already exists for exactly this — "focus and hover edges", and it clears
 *   1.4.11's 3:1 on all three surfaces, which an alpha tint cannot promise.
 *
 * The hover is a BORDER move and nothing else: no lift, no scale, no shadow.
 * The reference's panels do not move when you point at them.
 */

export type CardProps = {
  /**
   * The element to render. Cards are frequently semantic — `article` for a
   * project, `li` inside a grid — and forcing a wrapper div around every one of
   * them is how a list stops being a list for a screen reader.
   *
   * Deliberately NOT generic over the element's own prop type. A fully generic
   * polymorphic component needs a cast to express, and this codebase forbids
   * `any` (FE-06); every call site here passes plain HTML attributes, so
   * `ElementType` plus `HTMLAttributes` covers all of them honestly.
   */
  as?: ElementType
  /**
   * Whether the card responds to the pointer.
   *
   * Opt-in rather than automatic. A card that lights up on hover is telling the
   * reader it does something; the education and impact cards do not, and giving
   * them the affordance anyway is a small lie that costs a click to discover.
   */
  interactive?: boolean
  /**
   * The top hairline. On by default — it is the reference's grouping device and
   * the reason a column of panels reads as one grid.
   */
  edge?: boolean
  /** Padding. `none` is for cards that own an edge-to-edge image. */
  padding?: 'none' | 'sm' | 'md'
  className?: string
} & Omit<HTMLAttributes<HTMLElement>, 'color'>

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
} as const

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { as, interactive = false, edge = true, padding = 'md', className, children, ...props },
  ref,
) {
  return createElement(
    as ?? 'div',
    {
      ref,
      className: cn(
        'border-subtle bg-surface rounded-(--radius-lg) border',
        edge && 'panel-edge',
        interactive && [
          'hover:border-strong',
          // Colour only. Listing the properties rather than using
          // `transition-colors` keeps a future `transform` from being animated
          // by accident, which is how a flat card acquires a lift nobody asked
          // for.
          'transition-[border-color,background-color,color] duration-(--duration-hover) ease-(--ease-out)',
        ],
        PADDING[padding],
        className,
      ),
      ...props,
    },
    children,
  )
})
