import React, { useEffect, useState } from "react"
import Seo from "../components/seo"
import config from "../config"
import LiteratureNetwork from "../components/literature/LiteratureNetwork"

export default function PapersPage() {
  const [papers, setPapers] = useState([])
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${config.apiUrl}/literature`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        setPapers(data.papers || [])
        setStatus(data.status || null)
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
  }, [])

  const statusLine = (() => {
    if (!status || status.n_papers == null) return null
    const n = status.n_papers
    if (status.status === "ok") {
      return `${n} papers loaded from the local PAZy-first fixture`
    }
    if (status.status === "unavailable") {
      return `${n} papers · fixture unavailable`
    }
    return `${n} papers · ${status.status}`
  })()

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
      <header className="mb-4 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-semibold m-0 text-foreground">
          literature network (wip)
        </h1>
        <p className="mt-2 mb-0 text-muted-foreground text-sm sm:text-base">
          chronological citation network for plastic-degradation papers.
          PAZy-first prototype
        </p>
        {statusLine && (
          <p className="mt-1 mb-0 text-xs text-muted-foreground">{statusLine}</p>
        )}
      </header>

      {loading && (
        <p className="text-muted-foreground text-sm">Papers loading...</p>
      )}
      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm mb-4">
          Error, please try again
        </div>
      )}

      {!loading && !error && (
        <div className="h-[min(80vh,820px)] flex flex-col">
          <LiteratureNetwork papers={papers} />
        </div>
      )}
    </div>
  )
}

export const Head = () => (
  <Seo
    title="literature network (wip)"
    description="chronological citation network for plastic-degradation papers. PAZy-first prototype"
  />
)
