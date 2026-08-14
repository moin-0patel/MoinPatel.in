import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones of
 * the same kind. Without twMerge, `cn('p-4', props.className)` cannot be
 * overridden by a caller passing `p-6` — both land in the class list and the
 * result depends on stylesheet order rather than intent.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
