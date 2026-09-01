// frontend/src/components/corpus/ClusterHierarchyNav.jsx
//
// Angela PID navigation prototype: expand 30 → 60 → 90 cluster blocks and pin
// several nodes for side-by-side centroid sequence compare. Ancestral AA data
// is not loaded yet; centroids are labeled as interim stand-ins.
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "gatsby"
import config from "../../config"
import SequenceViewer from "../sequence/SequenceViewer"

function ChildCard({ child, pinned, onPin, onOpen }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-surface-raised flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {child.level}% ·{" "}
            <span className="font-mono">{String(child.cluster_id)}</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono break-all">
            centroid {child.centroid_accession || child.centroid_orf_id || "—"}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onPin(child)}
            className={`text-xs px-2 py-1 rounded border ${
              pinned
                ? "border-info text-info bg-info/10"
                : "border-border text-secondary-foreground hover:border-info"
            }`}
          >
            {pinned ? "Pinned" : "Pin"}
          </button>
          <button
            type="button"
            onClick={() => onOpen(child)}
            className="text-xs px-2 py-1 rounded border border-border text-secondary-foreground hover:border-info"
          >
            Open
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        {child.member_count != null && (
          <span>{child.member_count} members</span>
        )}
        {child.child_count != null && (
          <span>{child.child_count} children</span>
        )}
        {child.dominant_organism && (
          <span className="italic col-span-3 truncate" title={child.dominant_organism}>
            {child.dominant_organism}
          </span>
        )}
      </div>
    </div>
  )
}

function SteppedPath({ path, currentLevel }) {
  if (!path) return null
  const steps = [
    { level: 30, id: path.c30_id },
    { level: 60, id: path.c60_id },
    { level: 90, id: path.c90_id },
  ].filter(a => a.id != null)
  if (!steps.length) return null

  return (
    <nav aria-label="Centroid cluster path" className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground mr-1">Path</span>
      {steps.map((a, i) => {
        const active = Number(currentLevel) === a.level
        return (
          <React.Fragment key={a.level}>
            {i > 0 && (
              <span className="text-muted-foreground/70 text-xs px-0.5" aria-hidden="true">
                →
              </span>
            )}
            <Link
              to={`/cluster/${a.level}/${encodeURIComponent(String(a.id))}`}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-secondary-foreground hover:border-info hover:text-info"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="font-sans font-medium">{a.level}%</span>
              {String(a.id)}
            </Link>
          </React.Fragment>
        )
      })}
    </nav>
  )
}

function DeferredChildrenCallout({ deferred, childLevel }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-surface-raised/50 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          Expand unavailable
        </span>
        {deferred.expected != null && (
          <span className="text-xs text-muted-foreground">
            ~{deferred.expected} {childLevel}% children reported
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground m-0">
        Child listing needs a DB index on the clustering table. Use the path
        above or pin centroids to compare sequences.
      </p>
      <button
        type="button"
        className="mt-2 text-xs text-info hover:underline"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        {open ? "Hide details" : "Why?"}
      </button>
      {open && (
        <p className="text-xs text-muted-foreground mt-2 mb-0 leading-relaxed">
          {deferred.note ||
            "petadex_clustering has no index for 30/60/90 parent scans, so a full enumerate is not interactive yet."}
        </p>
      )}
    </div>
  )
}

function PinTray({ pins, onUnpin, sequences, seqStatus }) {
  if (!pins.length) return null

  return (
    <section className="card p-6 mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Compare pinned clusters
        </h3>
        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          Centroid stand-in
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Side-by-side color-coded sequences. Ancestral reconstructions will replace
        centroids when available.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {pins.map(pin => {
          const key = `${pin.level}:${pin.cluster_id}`
          return (
            <button
              key={key}
              type="button"
              onClick={() => onUnpin(pin)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs hover:border-destructive hover:text-destructive"
              title="Unpin"
            >
              <span className="font-medium">{pin.level}%</span>
              <span className="font-mono">{String(pin.cluster_id)}</span>
              <span aria-hidden="true">×</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pins.map(pin => {
          const key = `${pin.level}:${pin.cluster_id}`
          const seq = sequences[key]
          const st = seqStatus[key] || "idle"
          const len = seq ? seq.length : null
          return (
            <div key={key} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-sm font-semibold">
                  {pin.level}%{" "}
                  <span className="font-mono">{String(pin.cluster_id)}</span>
                </div>
                {len != null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {len} aa
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground m-0 mb-2 break-all">
                ORF {pin.centroid_orf_id ?? "—"} ·{" "}
                {pin.centroid_accession || "no accession"}
              </p>
              {len != null && (
                <div
                  className="h-1.5 rounded-full bg-border/80 mb-3 overflow-hidden"
                  title={`Length ${len} aa`}
                >
                  <div
                    className="h-full rounded-full bg-primary/50"
                    style={{
                      width: `${Math.min(100, (len / 800) * 100)}%`,
                    }}
                  />
                </div>
              )}
              {st === "loading" && (
                <p className="text-xs italic text-muted-foreground m-0">
                  Loading centroid sequence…
                </p>
              )}
              {st === "error" && (
                <p className="text-xs text-muted-foreground m-0">
                  Centroid sequence unavailable.
                </p>
              )}
              {st === "ready" && seq && (
                <SequenceViewer aminoAcidSequence={seq} nucleotideSequence={null} />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * @param {{
 *   level: string | number,
 *   clusterId: string | number,
 *   block?: object | null,
 * }} props
 */
export default function ClusterHierarchyNav({ level, clusterId, block = null }) {
  const lvl = Number(level)
  const [children, setChildren] = useState([])
  const [childLevel, setChildLevel] = useState(null)
  const [status, setStatus] = useState("idle")
  const [truncated, setTruncated] = useState(false)
  const [deferredChildren, setDeferredChildren] = useState(null)
  const [parent, setParent] = useState(null)
  const [path, setPath] = useState(null)
  const [pins, setPins] = useState([])
  const [sequences, setSequences] = useState({})
  const [seqStatus, setSeqStatus] = useState({})

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    setChildren([])
    setDeferredChildren(null)

    const childrenUrl = `${config.apiUrl}/cluster/${lvl}/${encodeURIComponent(String(clusterId))}/children`
    const parentUrl = `${config.apiUrl}/cluster/${lvl}/${encodeURIComponent(String(clusterId))}/parent`

    Promise.all([
      fetch(childrenUrl).then(async res => {
        if (!res.ok) throw new Error(`children ${res.status}`)
        return res.json()
      }),
      fetch(parentUrl).then(async res => {
        if (!res.ok) return { parent: null, path: null }
        return res.json()
      }),
    ])
      .then(([kids, parentPayload]) => {
        if (cancelled) return
        setChildren(kids.children || [])
        setChildLevel(kids.child_level ?? null)
        setTruncated(Boolean(kids.truncated))
        if (kids.deferred) {
          setDeferredChildren({
            expected: kids.expected_child_count,
            note: kids.note,
            reason: kids.reason,
          })
        }
        setParent(parentPayload.parent || null)
        setPath(parentPayload.path || null)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [lvl, clusterId])

  const pinKey = useCallback(pin => `${pin.level}:${pin.cluster_id}`, [])

  const isPinned = useCallback(
    child => pins.some(p => pinKey(p) === pinKey(child)),
    [pins, pinKey],
  )

  const togglePin = useCallback(
    child => {
      setPins(prev => {
        const key = pinKey(child)
        if (prev.some(p => pinKey(p) === key)) {
          return prev.filter(p => pinKey(p) !== key)
        }
        if (prev.length >= 4) return prev
        return [...prev, child]
      })
    },
    [pinKey],
  )

  const unpin = useCallback(
    child => {
      setPins(prev => prev.filter(p => pinKey(p) !== pinKey(child)))
    },
    [pinKey],
  )

  useEffect(() => {
    let cancelled = false

    pins.forEach(pin => {
      const key = pinKey(pin)
      if (!pin.centroid_orf_id) {
        setSeqStatus(s => (s[key] === "error" ? s : { ...s, [key]: "error" }))
        return
      }

      setSeqStatus(s => {
        if (s[key] === "ready" || s[key] === "loading") return s
        return { ...s, [key]: "loading" }
      })

      setSequences(existing => {
        if (existing[key]) return existing
        fetch(
          `${config.apiUrl}/orf/${encodeURIComponent(String(pin.centroid_orf_id))}`
        )
          .then(async res => {
            if (!res.ok) throw new Error("orf")
            return res.json()
          })
          .then(data => {
            if (cancelled) return
            const seq = data.sequence || ""
            if (!seq) {
              setSeqStatus(s => ({ ...s, [key]: "error" }))
              return
            }
            setSequences(s => ({ ...s, [key]: seq }))
            setSeqStatus(s => ({ ...s, [key]: "ready" }))
          })
          .catch(() => {
            if (!cancelled) setSeqStatus(s => ({ ...s, [key]: "error" }))
          })
        return existing
      })
    })

    return () => {
      cancelled = true
    }
  }, [pins, pinKey])

  const canExpand = lvl === 30 || lvl === 60
  const openChild = child => {
    if (typeof window !== "undefined") {
      window.location.href = `/cluster/${child.level}/${encodeURIComponent(String(child.cluster_id))}`
    }
  }

  const pinSelf = useMemo(() => {
    if (!block) return null
    return {
      level: lvl,
      cluster_id: block.cluster_id ?? clusterId,
      centroid_orf_id: block.centroid_orf_id,
      centroid_accession: block.centroid_accession,
      member_count: block.member_count,
      child_count: block.child_count,
      dominant_organism: block.dominant_organism,
    }
  }, [block, lvl, clusterId])

  return (
    <div className="mt-8 space-y-4">
      <SteppedPath path={path} currentLevel={lvl} />

      <div className="flex flex-wrap items-center gap-3">
        {parent && (
          <Link
            to={`/cluster/${parent.level}/${encodeURIComponent(String(parent.cluster_id))}`}
            className="text-sm text-info hover:underline"
          >
            ← Parent {parent.level}% cluster {String(parent.cluster_id)}
          </Link>
        )}
        {pinSelf && (
          <button
            type="button"
            onClick={() => togglePin(pinSelf)}
            className="text-sm px-3 py-1 rounded border border-border hover:border-info"
          >
            {isPinned(pinSelf) ? "Unpin this cluster" : "Pin this cluster centroid"}
          </button>
        )}
      </div>
      {pinSelf && !pins.length && (
        <p className="text-xs text-muted-foreground m-0 -mt-1">
          Pin this cluster to compare sequences side by side.
        </p>
      )}

      {canExpand && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-foreground m-0">
            Child clusters
            {childLevel != null ? ` (${childLevel}%)` : ""}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Expand one step down the identity hierarchy when available.
          </p>

          {status === "loading" && (
            <p className="text-sm italic text-muted-foreground m-0">
              Loading children…
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-muted-foreground m-0">
              Child clusters could not be loaded.
            </p>
          )}
          {status === "ready" && deferredChildren && (
            <DeferredChildrenCallout
              deferred={deferredChildren}
              childLevel={childLevel}
            />
          )}
          {status === "ready" && !deferredChildren && children.length === 0 && (
            <p className="text-sm text-muted-foreground m-0">
              No child clusters recorded under this block.
            </p>
          )}
          {status === "ready" && children.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {children.map(child => (
                  <ChildCard
                    key={`${child.level}:${child.cluster_id}`}
                    child={child}
                    pinned={isPinned(child)}
                    onPin={togglePin}
                    onOpen={openChild}
                  />
                ))}
              </div>
              {truncated && (
                <p className="text-xs text-muted-foreground mt-3 mb-0">
                  Showing the first 200 children by member count.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {lvl === 90 && (
        <p className="text-sm text-muted-foreground">
          90% clusters are leaves. Pin this centroid or walk up to the parent 60%
          cluster.
        </p>
      )}

      <PinTray
        pins={pins}
        onUnpin={unpin}
        sequences={sequences}
        seqStatus={seqStatus}
      />
    </div>
  )
}
