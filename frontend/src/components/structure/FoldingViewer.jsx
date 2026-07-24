import React, { useEffect, useMemo, useRef, useState } from "react"
import config from "../../config"
import ProteinViewer from "../protein/ProteinViewer"
import AnnotatedProteinViewer from "../protein/AnnotatedProteinViewer"
import { annotationRecordForAccession } from "../protein/annotation-reference/annotations"

const SOURCE_LABEL = {
  experimental_pdb: "Experimental structure",
  esmfold2_centroid_90: "ESMFold2 · 90% centroid",
  esmfold2_orf: "ESMFold2 · ORF prediction",
}

function formatScore(v, digits = 2) {
  if (v == null || Number.isNaN(Number(v))) return "—"
  return Number(v).toFixed(digits)
}

function PaeHeatmap({ matrix }) {
  const canvasRef = useRef(null)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !matrix?.length) return
    const n = matrix.length
    const size = Math.min(360, Math.max(160, n * 3))
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let max = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = Number(matrix[i][j])
        if (Number.isFinite(v) && v > max) max = v
      }
    }
    if (max <= 0) max = 1
    const cell = size / n
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = Number(matrix[i][j]) / max
        // blue (low error) → yellow → red (high error)
        const r = Math.round(255 * Math.min(1, v * 1.2))
        const g = Math.round(255 * (1 - Math.abs(v - 0.5) * 1.5))
        const b = Math.round(255 * (1 - v))
        ctx.fillStyle = `rgb(${r},${Math.max(0, g)},${Math.max(0, b)})`
        ctx.fillRect(j * cell, i * cell, cell + 0.5, cell + 0.5)
      }
    }
  }, [matrix])

  if (!matrix?.length) {
    return (
      <p className="m-0 text-sm text-muted-foreground italic">
        PAE matrix unavailable (S3 arrays not readable yet, or schema pending).
      </p>
    )
  }

  const onMove = e => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const n = matrix.length
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * n)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * n)
    if (x < 0 || y < 0 || x >= n || y >= n) {
      setHover(null)
      return
    }
    setHover({ i: y, j: x, v: matrix[y][x] })
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="rounded-md border border-border max-w-full cursor-crosshair"
        style={{ width: "min(360px, 100%)", height: "auto", aspectRatio: "1" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        aria-label="Predicted aligned error heatmap"
      />
      <p className="m-0 text-xs text-muted-foreground">
        {hover
          ? `i=${hover.i + 1}, j=${hover.j + 1} · PAE ${formatScore(hover.v, 2)}`
          : "Hover for residue-pair PAE. Downsampled for display; Mol* may also expose PAE when present in the CIF."}
      </p>
    </div>
  )
}

/**
 * Alex Folding Viewer: Mol* + base/finetune toggle + metrics + PAE + SAE stub.
 */
export default function FoldingViewer({
  accession = null,
  orfId = null,
  title = "Folding Viewer",
  emptyMessage = "No structure available for this sequence yet.",
}) {
  const [info, setInfo] = useState(null)
  const [status, setStatus] = useState("idle")
  const [errorMsg, setErrorMsg] = useState(null)
  const [variant, setVariant] = useState("base")
  const [metrics, setMetrics] = useState(null)
  const [metricsStatus, setMetricsStatus] = useState("idle")

  useEffect(() => {
    if (orfId == null && !accession) {
      setStatus("empty")
      setInfo(null)
      return
    }

    let cancelled = false
    setStatus("loading")
    setErrorMsg(null)
    setInfo(null)

    const qs = `?variant=${encodeURIComponent(variant)}`
    const url =
      orfId != null
        ? `${config.apiUrl}/structure/orf/${encodeURIComponent(String(orfId))}${qs}`
        : `${config.apiUrl}/structure/accession/${encodeURIComponent(accession)}${qs}`

    fetch(url)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) {
          setStatus("empty")
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(body.error || `Request failed (${res.status})`)
          return
        }
        const data = await res.json()
        if (cancelled) return
        setInfo(data)
        setStatus("ready")
      })
      .catch(err => {
        if (cancelled) return
        console.error("Structure resolve error:", err)
        setStatus("error")
        setErrorMsg("Could not resolve structure.")
      })

    return () => {
      cancelled = true
    }
  }, [orfId, accession, variant])

  useEffect(() => {
    const id = orfId ?? info?.orf_id
    if (id == null || info?.source === "experimental_pdb") {
      setMetrics(null)
      setMetricsStatus("idle")
      return
    }
    let cancelled = false
    setMetricsStatus("loading")
    fetch(
      `${config.apiUrl}/structure/metrics/${encodeURIComponent(String(id))}?variant=${encodeURIComponent(variant)}`
    )
      .then(async res => {
        if (cancelled) return
        if (!res.ok) {
          setMetricsStatus("error")
          setMetrics(null)
          return
        }
        setMetrics(await res.json())
        setMetricsStatus("ready")
      })
      .catch(() => {
        if (cancelled) return
        setMetricsStatus("error")
        setMetrics(null)
      })
    return () => {
      cancelled = true
    }
  }, [orfId, info?.orf_id, info?.source, variant])

  const record =
    info?.source === "experimental_pdb" && info?.accession
      ? annotationRecordForAccession(info.accession)
      : null

  const sourceLabel = info
    ? SOURCE_LABEL[info.source] || info.method || info.source
    : null

  const isPredicted =
    info?.source === "esmfold2_centroid_90" || info?.source === "esmfold2_orf"

  const structureUrl = useMemo(() => {
    if (!info) return null
    if (variant === "finetune" && info.finetune_structure_url) {
      return info.finetune_structure_url
    }
    return info.structure_url
  }, [info, variant])

  const showFinetuneToggle = Boolean(info?.finetune_structure_url)

  const figureContext =
    info?.orf_id != null
      ? `ORF ${info.orf_id}`
      : info?.accession || "this structure"

  return (
    <div className="flex flex-col gap-4">
      {/* PNG Website Display: Folding Viewer | corresponding figures beside it */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="rounded-2xl border-border overflow-hidden bg-surface-overlay">
            <div className="p-4 bg-surface-raised border-b-border-strong flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg m-0 text-muted-foreground font-semibold">
                {title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {showFinetuneToggle && status === "ready" ? (
                  <div
                    className="inline-flex rounded-md border border-border overflow-hidden text-xs font-medium"
                    role="group"
                    aria-label="Structure variant"
                  >
                    <button
                      type="button"
                      className={`px-3 py-1.5 ${
                        variant === "base"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-transparent text-muted-foreground"
                      }`}
                      onClick={() => setVariant("base")}
                    >
                      Base
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 border-l border-border ${
                        variant === "finetune"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-transparent text-muted-foreground"
                      }`}
                      onClick={() => setVariant("finetune")}
                    >
                      Finetune
                    </button>
                  </div>
                ) : null}
                {sourceLabel && status === "ready" ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                    {sourceLabel}
                    {info?.format ? ` · ${info.format}` : ""}
                    {isPredicted ? ` · ${variant}` : ""}
                  </span>
                ) : null}
              </div>
            </div>

            {status === "loading" || status === "idle" ? (
              <div className="p-8 text-sm text-muted-foreground italic">
                Resolving structure…
              </div>
            ) : null}

            {status === "empty" ? (
              <div className="p-8 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : null}

            {status === "error" ? (
              <div className="p-8 text-sm text-destructive">{errorMsg}</div>
            ) : null}

            {status === "ready" && info && record ? (
              <div className="p-4 bg-secondary/20">
                <AnnotatedProteinViewer
                  accession={info.accession}
                  record={record}
                  height="500px"
                  showControls={true}
                  variant="embedded"
                />
              </div>
            ) : null}

            {status === "ready" && info && !record ? (
              <div className="w-full h-[500px] bg-secondary">
                <ProteinViewer
                  key={`${structureUrl}-${variant}`}
                  accession={info.accession || undefined}
                  structureUrl={structureUrl}
                  format={info.format}
                  label={
                    info.orf_id != null
                      ? `ORF ${info.orf_id}`
                      : info.accession || "Structure"
                  }
                  width="100%"
                  height="500px"
                  showControls={true}
                  enableMeasurement={true}
                  enableSelection={true}
                />
              </div>
            ) : null}
          </div>

          {status === "ready" && info && isPredicted ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4 bg-surface-raised">
                <h4 className="m-0 mb-3 text-sm font-semibold text-foreground">
                  Confidence metrics
                </h4>
                {metricsStatus === "loading" ? (
                  <p className="m-0 text-sm text-muted-foreground italic">
                    Loading metrics…
                  </p>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-2 text-muted-foreground">
                            mean-pLDDT
                          </td>
                          <td className="py-2 font-mono text-right">
                            {formatScore(metrics?.mean_plddt, 1)}
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-2 text-muted-foreground">pTM</td>
                          <td className="py-2 font-mono text-right">
                            {formatScore(metrics?.ptm, 3)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">
                            MolProbity
                          </td>
                          <td className="py-2 font-mono text-right">
                            {formatScore(metrics?.molprobity, 2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="mt-3 mb-0 text-xs text-muted-foreground">
                      {metrics?.disclaimer ||
                        "For centroids / non-PDB predictions, these metrics can’t be validated against an experimental structure."}
                      {metrics && !metrics.available
                        ? ` (${metrics.reason || "arrays unavailable"})`
                        : ""}
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-border p-4 bg-surface-raised">
                <h4 className="m-0 mb-3 text-sm font-semibold text-foreground">
                  PAE
                </h4>
                <PaeHeatmap matrix={metrics?.pae} />
              </div>
            </div>
          ) : null}

          {status === "ready" && info ? (
            <div className="rounded-xl border border-dashed border-border p-4 bg-surface-overlay/50">
              <h4 className="m-0 mb-1 text-sm font-semibold text-foreground">
                SAE features
              </h4>
              <p className="m-0 text-sm text-muted-foreground">
                Natural-language interpretability of ESM-C SAE features is
                planned for Atlas search/compare (with Alex). See{" "}
                <a
                  href="https://arxiv.org/pdf/2606.12209"
                  className="text-info underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  arXiv:2606.12209
                </a>
                .
              </p>
            </div>
          ) : null}
        </div>

        {/* Beside each viewer: corresponding Exp / benchmark figures (fill later) */}
        <aside className="lg:col-span-2 rounded-2xl border border-border bg-surface-raised p-4 flex flex-col gap-3">
          <div>
            <h4 className="m-0 text-sm font-semibold text-foreground">
              Corresponding figures
            </h4>
            <p className="m-0 mt-1 text-xs text-muted-foreground">
              ESMC finetune / benchmark plots for {figureContext}. Same resolve
              flow as the viewer (ORFid → CIF + arrays). Charts land when Alex
              ships Exp. 1–2 results.
            </p>
          </div>
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 min-h-[120px] flex flex-col justify-center gap-1">
            <p className="m-0 text-xs font-medium text-foreground">
              ESMC Finetune Graphs
            </p>
            <p className="m-0 text-xs text-muted-foreground">
              Exp. 1 / Exp. 2 — base vs finetune (TM, lDDT, …)
            </p>
          </div>
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 min-h-[100px] flex flex-col justify-center gap-1">
            <p className="m-0 text-xs font-medium text-foreground">
              Confidence calibration
            </p>
            <p className="m-0 text-xs text-muted-foreground">
              pLDDT vs lDDT · pTM vs TM (when PDB reference exists)
            </p>
          </div>
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 min-h-[80px] flex items-center">
            <p className="m-0 text-xs text-muted-foreground">
              Figure slot — pending data
            </p>
          </div>
        </aside>
      </div>

      {status === "ready" && info ? (
        <div className="p-4 bg-blue-300/40 dark:bg-blue-950/40 rounded-lg border-l-info border-l-4">
          <p className="m-0 text-sm text-primary dark:text-secondary">
            <strong>Tip:</strong> Click and drag to rotate. Scroll to zoom.
            {record
              ? " Hover or click highlighted residues for annotation notes."
              : ""}
          </p>
        </div>
      ) : null}
    </div>
  )
}
