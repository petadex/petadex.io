import React, { useEffect, useState } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import { useScrollHeader } from "../hooks/useScrollHeader"
import { fetchMethodologyContent } from "../utils/cathRemoteContent"

/**
 * Methodology page shell. Long article text loads from S3
 * (`config.methodologyContentUrl`), not from this file.
 *
 * Do not put the "Component-level HMM generation (PAZy HMMs)" writeup on the
 * website unless Thomas reverses that call.
 */
const MethodologyPage = () => {
  useScrollHeader()
  const [content, setContent] = useState(null)
  const [status, setStatus] = useState("loading") // loading | ready | empty | error

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetchMethodologyContent()
      .then(payload => {
        if (cancelled) return
        if (!payload || !Array.isArray(payload.sections) || !payload.sections.length) {
          setContent(null)
          setStatus("empty")
          return
        }
        setContent(payload)
        setStatus("ready")
      })
      .catch(() => {
        if (cancelled) return
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="py-16 md:py-20">
      <Container>
        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
          Reference
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary mb-4">Methodology</h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-3xl mb-10">
          [PENDING INFORMATION]
        </p>

        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Loading methodology…</p>
        )}

        {(status === "empty" || status === "error") && (
          <div className="rounded-2xl border border-border bg-card/40 p-5 md:p-8 max-w-3xl">
            <p className="text-sm text-muted-foreground m-0 leading-relaxed">
              [PENDING INFORMATION]
            </p>
          </div>
        )}

        {status === "ready" && content && (
          <article
            id={content.anchorId || "methodology-article"}
            className="scroll-mt-28 rounded-2xl border border-border bg-card/40 p-5 md:p-8 max-w-3xl"
          >
            {content.title && (
              <h2 className="text-xl md:text-2xl font-semibold text-primary mb-1">
                {content.title}
              </h2>
            )}
            {content.byline && (
              <p className="text-xs text-muted-foreground mb-6">{content.byline}</p>
            )}
            {content.sections.map((section, i) => (
              <div key={section.heading || i}>
                {section.heading && (
                  <h3 className="text-base font-semibold text-foreground mt-6 mb-2">
                    {section.heading}
                  </h3>
                )}
                {(section.paragraphs || []).map((para, j) => (
                  <p
                    key={j}
                    className="text-sm text-muted-foreground leading-relaxed mb-4"
                  >
                    {para}
                  </p>
                ))}
              </div>
            ))}
            {content.warning && (
              <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300/90">
                {content.warning}
              </div>
            )}
          </article>
        )}
      </Container>
    </section>
  )
}

export default MethodologyPage

export const Head = () => (
  <Seo title="Methodology" description="How PETadex data was generated." />
)
