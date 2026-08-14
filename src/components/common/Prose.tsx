import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/cn'
import { isExternalUrl, markdownSanitiseSchema } from '@/lib/markdown'

/**
 * Prose — the ONLY markdown renderer in the product (PRD 30.2, SEC-05).
 *
 * Every `_md` column renders through here. Concentrating it in one audited
 * component is what makes the SEC-05 lint rule enforceable: if markdown were
 * rendered ad hoc, "is raw HTML disabled everywhere?" would be unanswerable.
 *
 * Note there is no `dangerouslySetInnerHTML` below — react-markdown builds a
 * React tree, and raw HTML would require `rehype-raw`, which is deliberately
 * not installed.
 */
export function Prose({
  markdown,
  className,
}: {
  markdown: string | null | undefined
  className?: string
}) {
  // A block whose source field is empty is omitted entirely, heading included
  // (14.1). Returning null here is what makes that possible at the call site.
  if (!markdown?.trim()) return null

  return (
    <div
      className={cn(
        'measure text-secondary',
        // FR-CASE-10 / 32.2 — the reading scale. Written as explicit child
        // selectors rather than a typography plugin so the values trace back
        // to the tokens in Section 32.
        '[&_p]:my-4 [&_p]:leading-[--leading-body]',
        '[&_h3]:text-primary [&_h3]:font-display [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl',
        '[&_h4]:text-primary [&_h4]:font-display [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-lg',
        '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-1.5 [&_li]:pl-1',
        '[&_strong]:text-primary [&_strong]:font-semibold',
        '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-strong',
        '[&_code]:bg-surface-raised [&_code]:text-primary [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5',
        '[&_pre]:bg-surface-raised [&_pre]:border-subtle [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-[--radius-md] [&_pre]:border [&_pre]:p-4',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_blockquote]:border-accent [&_blockquote]:text-secondary [&_blockquote]:my-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic',
        '[&_hr]:border-subtle [&_hr]:my-8',
        // Wide content scrolls inside its own container rather than pushing the
        // page sideways (33.1: no horizontal scroll at any width).
        '[&_table]:my-5 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto',
        '[&_th]:border-subtle [&_th]:text-primary [&_th]:border-b [&_th]:px-3 [&_th]:py-2 [&_th]:text-left',
        '[&_td]:border-subtle [&_td]:border-b [&_td]:px-3 [&_td]:py-2',
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitiseSchema]]}
        components={{
          a: ({ href, children, ...props }) => {
            const external = isExternalUrl(href)
            return (
              <a
                href={href}
                // FR-NAV-06 — noopener is the security half: without it the
                // opened page can navigate this one via window.opener.
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                {...props}
              >
                {children}
                {external && <span className="visually-hidden"> (opens in a new tab)</span>}
              </a>
            )
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
