import { Download, ExternalLink, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePublishedResume } from '@/hooks/useSiteContent'
import { pageTitle } from '@/lib/seo'
import { getSignedResumeUrl } from '@/services/resume.service'

/**
 * /resume — PRD FR-RES-03, FR-RES-04, FR-RES-06, TD-08.
 *
 * The PDF lives in a PRIVATE bucket, so nothing here can be a plain link. Two
 * steps: read the published row's metadata (public via
 * `resume_versions_select_public`), then mint a 60-second signed URL for that
 * one object.
 *
 * The short TTL is the reason for the structure below. A URL fetched on mount
 * would be dead before a reader who skims the page first ever clicks Download.
 * So the embed gets a URL on mount (it loads immediately), and the Download
 * button mints a FRESH one at click time.
 */
export default function ResumePage() {
  const { data: resume, isPending } = usePublishedResume()
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [embedFailed, setEmbedFailed] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!resume) return
    let cancelled = false
    getSignedResumeUrl(resume.storagePath)
      .then((url) => {
        if (!cancelled) setEmbedUrl(url)
      })
      .catch(() => {
        if (!cancelled) setEmbedFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [resume])

  /**
   * FR-RES-04 — the Download button mints its own URL rather than reusing the
   * embed's, which by now is almost certainly expired.
   */
  const handleDownload = async () => {
    if (!resume) return
    setDownloading(true)
    setError(null)
    try {
      const url = await getSignedResumeUrl(resume.storagePath)
      if (!url) throw new Error('No URL returned')
      // Opened rather than fetched: the browser's own download handling deals
      // with the Content-Disposition the signed URL carries.
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('That link could not be generated. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (isPending) {
    return (
      <div className="container-page py-16">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-4 h-4 w-72" />
        <Skeleton className="mt-8 h-[70vh] w-full" />
      </div>
    )
  }

  /*
   * FR-RES-06 — "If no published resume exists, all resume CTAs are hidden
   * site-wide and /resume shows a neutral message."
   *
   * Neutral, and deliberately not an apology or an error. Nothing has gone
   * wrong; there simply is not one published. `noindex` keeps an empty page
   * out of search results, so it cannot become the result someone finds when
   * they search for the resume.
   */
  if (!resume) {
    return (
      <>
        <SEO title={pageTitle('Resume')} noindex />
        <div className="container-page py-24 text-center">
          <FileText className="text-muted mx-auto size-10" aria-hidden="true" />
          <h1 className="text-primary mt-6">Resume</h1>
          <p className="text-secondary measure mx-auto mt-3">
            There is no resume available to download at the moment.
          </p>
          <Button variant="secondary" className="mt-8" asChild>
            <a href="/contact">Get in touch instead</a>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO
        title={pageTitle('Resume')}
        description="Download Moin Patel's current resume."
        // TD-08 / R-05: the document itself must not be indexed. A crawlable
        // copy of a PDF with personal contact details outlives any later
        // decision to take it down.
        noindex
      />

      <div className="container-page py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-primary">Resume</h1>
            <p className="text-secondary mt-2 text-sm">
              {resume.versionLabel ? `${resume.versionLabel} · ` : ''}
              {resume.fileName}
            </p>
          </div>

          <Button onClick={() => void handleDownload()} loading={downloading}>
            <Download className="size-4" aria-hidden="true" />
            Download PDF
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-danger mt-4 text-sm">
            {error}
          </p>
        )}

        {/*
         * FR-RES-04 — "a viewer with a Download button and a graceful fallback
         * link if the browser cannot embed PDFs (common on mobile)."
         *
         * <object> rather than <iframe>: its children render as the fallback
         * when the plugin is unavailable, which is exactly the mobile case,
         * and it needs no feature detection to get right.
         */}
        <div className="border-subtle bg-surface mt-8 overflow-hidden rounded-[--radius-lg] border">
          {embedUrl && !embedFailed ? (
            <object
              data={embedUrl}
              type="application/pdf"
              // Tall enough to read, short enough that the Download button
              // stays reachable without scrolling past the whole document.
              className="h-[70vh] min-h-[420px] w-full"
              aria-label={`Resume — ${resume.fileName}`}
            >
              <ResumeFallback onDownload={() => void handleDownload()} downloading={downloading} />
            </object>
          ) : (
            <ResumeFallback onDownload={() => void handleDownload()} downloading={downloading} />
          )}
        </div>
      </div>
    </>
  )
}

/** Shown when the browser will not embed a PDF, and while the URL is minting. */
function ResumeFallback({
  onDownload,
  downloading,
}: {
  onDownload: () => void
  downloading: boolean
}) {
  return (
    <div className="px-6 py-16 text-center">
      <FileText className="text-muted mx-auto size-8" aria-hidden="true" />
      <p className="text-secondary measure mx-auto mt-4 text-sm">
        Your browser cannot display PDFs inline. Open it in a new tab instead — most phones do this
        rather than embedding.
      </p>
      <Button variant="secondary" className="mt-6" onClick={onDownload} loading={downloading}>
        <ExternalLink className="size-4" aria-hidden="true" />
        Open the PDF
      </Button>
    </div>
  )
}
