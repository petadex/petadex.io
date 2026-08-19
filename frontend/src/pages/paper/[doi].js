import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Seo from "../../components/seo"
import config from "../../config"
import { plasticColor } from "../../components/literature/plasticColors"
import { paperPath, pathSegmentToDoi } from "../../components/literature/doiPath"

export default function PaperPage({ params }) {
  const raw = params?.doi ? pathSegmentToDoi(params.doi) : ""
  const [paper, setPaper] = useState(null)
  const [outgoing, setOutgoing] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!raw) {
      setLoading(false)
      setError("missing_doi")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${config.apiUrl}/literature/item/${encodeURIComponent(raw)}`)
      .then(async res => {
        if (res.status === 404) throw new Error("not_found")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        setPaper(data.paper || null)
        setOutgoing(data.outgoing_citations || [])
      })
      .catch(err => {
        if (!cancelled) setError(err.message || String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [raw])

  // SEO description = paper overview (client-fetched; Head can't see it yet).
  useEffect(() => {
    if (!paper) return
    const overview = paper.paper_summary || ""
    const titleBase = paper.paper_title || paper.doi || "DOI pending"
    document.title = `${titleBase} | PETadex`
    const metas = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]
    for (const sel of metas) {
      const el = document.querySelector(sel)
      if (el && overview) el.setAttribute("content", overview)
    }
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute("content", titleBase)
  }, [paper])

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <p className="mb-4 text-sm">
        <Link to="/papers" className="text-accent hover:underline">
          ← Back to papers
        </Link>
      </p>

      {loading && <p className="text-muted-foreground text-sm">Papers loading...</p>}

      {!loading && error === "missing_doi" && (
        <div className="rounded border border-dashed border-border p-6">
          <h1 className="text-xl font-semibold m-0">DOI pending</h1>
        </div>
      )}

      {!loading && error === "not_found" && (
        <div className="rounded border border-dashed border-border p-6">
          <h1 className="text-xl font-semibold m-0">Paper not found</h1>
          <p className="mt-2 mb-0 text-muted-foreground text-sm">
            No paper with this DOI in the prototype dataset.
          </p>
        </div>
      )}

      {!loading && error && error !== "not_found" && error !== "missing_doi" && (
        <div className="rounded border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
          Error, please try again
        </div>
      )}

      {!loading && paper && (
        <article>
          <h1 className="text-2xl sm:text-3xl font-semibold m-0 text-foreground leading-snug">
            {paper.paper_title || paper.doi}
          </h1>

          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Date published
              </dt>
              <dd className="m-0 mt-1 font-mono">{paper.date_published || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Authors
              </dt>
              <dd className="m-0 mt-1">
                {(paper.authors || []).length
                  ? paper.authors.join(", ")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                DOI
              </dt>
              <dd className="m-0 mt-1">
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline font-mono break-all"
                >
                  {paper.doi}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Overview
              </dt>
              <dd className="m-0 mt-1 text-foreground/90">
                {paper.paper_summary || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Plastics studied
              </dt>
              <dd className="m-0 mt-1 flex flex-wrap gap-2">
                {(paper.plastics_studied || []).length === 0
                  ? "—"
                  : paper.plastics_studied.map(pl => (
                      <span
                        key={pl}
                        className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-0.5"
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm"
                          style={{ background: plasticColor(pl) }}
                        />
                        {pl}
                      </span>
                    ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Proteins studied (count)
              </dt>
              <dd className="m-0 mt-1 font-mono">
                {paper.proteins_studied_count == null
                  ? "—"
                  : paper.proteins_studied_count}
              </dd>
            </div>
          </dl>

          <section className="mt-8">
            <h2 className="text-lg font-semibold m-0">
              Citations in this dataset
            </h2>
            {outgoing.length === 0 ? (
              <p className="mt-2 mb-0 text-sm text-muted-foreground">
                citations still pending
              </p>
            ) : (
              <ul className="mt-3 mb-0 pl-5 space-y-2 text-sm">
                {outgoing.map(c => (
                  <li key={c.doi}>
                    <Link
                      to={paperPath(c.doi)}
                      className="text-accent hover:underline"
                    >
                      {c.paper_title || c.doi}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">
                      {c.doi}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>
      )}
    </div>
  )
}

export const Head = ({ params }) => {
  const doi = params?.doi ? pathSegmentToDoi(params.doi) : ""
  return (
    <Seo
      title={doi ? `Paper · ${doi}` : "DOI pending"}
      description={doi ? `Paper ${doi}` : "DOI pending"}
    />
  )
}

