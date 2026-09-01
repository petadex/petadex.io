// frontend/src/pages/organisms.js
// Organism Atlas, full port of the Replit PETadex atlas UI
// Gatsby page, self-contained, uses recharts (already in package.json)
import React, { useState, useEffect, useRef, useCallback } from "react"
import { navigate } from "gatsby"
import Seo from "../components/seo"
import config from "../config"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts"

// ── Color constants (matches Replit PETadex dark theme) ────────────────────
const C = {
  confirmed: "#4ade80",
  predicted: "#fbbf24",
  listed:    "#94a3b8",
  petblue:   "#60a5fa",
  primary:   "#f97316",
  muted:     "#64748b",
  border:    "rgba(255,255,255,0.1)",
  card:      "#161b2e",
  bg:        "#0d1120",
  fg:        "#dde4f0",
}

const TIER_COLOR = { Confirmed: C.confirmed, Predicted: C.predicted, Listed: C.listed }
const CHART_COLORS = [C.primary, C.petblue, C.confirmed, C.predicted, "#a78bfa"]
const CHART_TICK = { fill: C.muted, fontSize: 11 }

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null || Number.isNaN(n)) return "-"
  return new Intl.NumberFormat("en-US").format(n)
}
function noveltyColor(score) {
  if (score >= 70) return C.confirmed
  if (score >= 40) return C.predicted
  return "#ef4444"
}
function parseQS() {
  if (typeof window === "undefined") return {}
  const sp = new URLSearchParams(window.location.search)
  return {
    q:      sp.get("q") || "",
    filter: sp.get("filter") || "all",
    tier:   sp.get("tier") || "all",
    sort:   sp.get("sort") || "name",
    page:   Number(sp.get("page") || "1") || 1,
    org:    sp.get("org") || null,
  }
}
function pushQS(patch) {
  if (typeof window === "undefined") return
  const prev = parseQS()
  const next = { ...prev, ...patch }
  const sp = new URLSearchParams()
  if (next.q)                        sp.set("q", next.q)
  if (next.filter && next.filter !== "all") sp.set("filter", next.filter)
  if (next.tier && next.tier !== "all")     sp.set("tier", next.tier)
  if (next.sort && next.sort !== "name")    sp.set("sort", next.sort)
  if (next.page && next.page > 1)    sp.set("page", String(next.page))
  if (next.org)                      sp.set("org", next.org)
  const qs = sp.toString()
  navigate(`/organisms${qs ? `?${qs}` : ""}`, { replace: false })
}

// ── Plastic pill ─────────────────────────────────────────────────────────────
function PlasticPill({ label, cls }) {
  const isBio = (cls || "").toLowerCase().includes("bio")
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 6px",
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 600,
      background: isBio ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.15)",
      color: isBio ? C.confirmed : C.petblue,
      border: `1px solid ${isBio ? "rgba(74,222,128,0.3)" : "rgba(96,165,250,0.3)"}`,
    }}>
      {label}
    </span>
  )
}

// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const color = TIER_COLOR[tier] || C.listed
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color,
      border: `1px solid ${color}55`,
      background: `${color}18`,
      borderRadius: 999,
      padding: "1px 6px",
    }}>
      {tier}
    </span>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats, loading, error }) {
  const items = stats ? [
    { label: "Total Organisms",    value: fmt(stats.total_organisms),  color: C.primary },
    { label: "Confirmed",          value: fmt(stats.confirmed_count),  color: C.confirmed },
    { label: "Predicted",          value: fmt(stats.predicted_count),  color: C.predicted },
    { label: "Listed",             value: fmt(stats.listed_count),     color: C.listed },
    { label: "Genera",             value: fmt(stats.unique_genera),    color: C.fg },
    { label: "Genome Assemblies",  value: fmt(stats.genome_count),     color: C.petblue },
    { label: "BacDive Records",    value: fmt(stats.bacdive_count),    color: C.fg },
    { label: "Unique Plastics",    value: fmt(stats.unique_plastics),  color: C.fg },
  ] : []

  if (error) return (
    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, color: "#ef4444", fontSize: 13, background: C.card }}>
      Failed to load atlas statistics.
    </div>
  )

  return (
    <div style={{ display: "flex", flexWrap: "wrap", borderBottom: `1px solid ${C.border}`, background: C.card, overflowX: "auto" }}>
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ padding: "12px 20px", borderRight: `1px solid ${C.border}` }}>
              <div style={{ width: 60, height: 10, background: "#333", borderRadius: 4, marginBottom: 6 }} />
              <div style={{ width: 48, height: 22, background: "#333", borderRadius: 4 }} />
            </div>
          ))
        : items.map(s => (
            <div key={s.label} style={{ padding: "12px 20px", borderRight: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 2 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: s.color, fontVariantNumeric: "tabular-nums" }}>
                {s.value}
              </div>
            </div>
          ))
      }
    </div>
  )
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",         label: "All" },
  { key: "bioplastic",  label: "Bioplastic" },
  { key: "conventional",label: "Conventional" },
  { key: "genome",      label: "Has genome" },
  { key: "bacdive",     label: "In BacDive" },
]
const TIERS = [
  { key: "all",       label: "All tiers" },
  { key: "confirmed", label: "Confirmed" },
  { key: "predicted", label: "Predicted" },
  { key: "listed",    label: "Listed" },
]
const SORTS = [
  { key: "name",    label: "Name" },
  { key: "novelty", label: "Novelty" },
  { key: "sra",     label: "SRA runs" },
  { key: "pubmed",  label: "PubMed" },
  { key: "entries", label: "Entries" },
  { key: "year",    label: "First year" },
]

function Toolbar({ query, onQuery, filter, onFilter, tier, onTier, sort, onSort, total, fetching }) {
  const [localQ, setLocalQ] = useState(query)
  const timer = useRef(null)
  useEffect(() => { setLocalQ(query) }, [query])

  function handleInput(v) {
    setLocalQ(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onQuery(v), 300)
  }

  const pillBase = { borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${C.border}`, background: "transparent", color: C.muted, transition: "all 0.15s" }
  const pillActive = { ...pillBase, borderColor: `${C.primary}80`, background: `${C.primary}25`, color: C.primary }
  const tierActive = { ...pillBase, borderColor: `${C.petblue}80`, background: `${C.petblue}25`, color: C.petblue }

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bg}99`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ position: "relative", maxWidth: 380, width: "100%" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: C.muted, pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={localQ}
            onChange={e => handleInput(e.target.value)}
            placeholder="Search organism, genus, phylum…"
            style={{ width: "100%", paddingLeft: 32, paddingRight: 10, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.fg, fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: C.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {fetching ? "Searching…" : `${fmt(total) ?? 0} organisms`}
          </span>
          <select
            value={sort}
            onChange={e => onSort(e.target.value)}
            style={{ height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.fg, fontSize: 12, padding: "0 10px", cursor: "pointer", outline: "none" }}
          >
            {SORTS.map(s => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => onFilter(f.key)} style={filter === f.key ? pillActive : pillBase}>{f.label}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TIERS.map(t => (
            <button key={t.key} onClick={() => onTier(t.key)} style={tier === t.key ? tierActive : pillBase}>{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Organisms table ───────────────────────────────────────────────────────────
const thStyle = { padding: "8px 12px", fontSize: 11, fontWeight: 600, textAlign: "left", color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }
const tdStyle = { padding: "8px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}` }

function OrganismsTable({ organisms, loading, error, onSelect }) {
  if (error) return (
    <div style={{ padding: "60px 16px", textAlign: "center", color: "#ef4444", fontSize: 13 }}>
      Could not load organisms. Check your filters or try reloading.
    </div>
  )

  const cols = ["Organism", "Genus", "Phylum", "Plastics", "#Types", "1st Year", "SRA", "PubMed", "Genome", "BacDive", "Novelty"]

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr>
            {cols.map(c => <th key={c} style={thStyle}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 12 }).map((_, i) => (
            <tr key={`sk-${i}`}>
              {cols.map(c => (
                <td key={c} style={tdStyle}>
                  <div style={{ height: 12, background: "#1e2740", borderRadius: 4, width: c === "Organism" ? 160 : 60 }} />
                </td>
              ))}
            </tr>
          ))}
          {!loading && !error && organisms && organisms.length === 0 && (
            <tr><td colSpan={11} style={{ padding: "60px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>
              No organisms match this query. Clear the search or filters.
            </td></tr>
          )}
          {!loading && !error && organisms && organisms.map(org => (
            <tr
              key={org.name}
              onClick={() => onSelect(org.name)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(org.name)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open details for ${org.name}`}
              style={{ cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={tdStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontWeight: 700, color: C.fg, fontStyle: "italic" }}>{org.name}</span>
                  <TierBadge tier={org.confidence_tier} />
                </div>
              </td>
              <td style={{ ...tdStyle, color: C.muted }}>{org.genus || "-"}</td>
              <td style={{ ...tdStyle, color: C.muted }}>{org.phylum || "-"}</td>
              <td style={tdStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 200 }}>
                  {(org.plastics || []).slice(0, 3).map((p, i) => (
                    <PlasticPill key={`${p}-${i}`} label={p} cls={(org.plastics_cls || [])[i]} />
                  ))}
                  {(org.plastics || []).length > 3 && (
                    <span style={{ fontSize: 10, color: C.muted }}>+{org.plastics.length - 3}</span>
                  )}
                </div>
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{org.n_entries}</td>
              <td style={{ ...tdStyle, textAlign: "right", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{org.first_year || "-"}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {org.sra_rc > 0 ? org.sra_rc : <span style={{ color: C.muted }}>-</span>}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {org.pm_total > 0 ? org.pm_total : <span style={{ color: C.muted }}>-</span>}
              </td>
              <td style={tdStyle}>
                {org.genome_acc
                  ? <span style={{ fontFamily: "monospace", fontSize: 10, color: C.petblue, background: `${C.petblue}18`, border: `1px solid ${C.petblue}55`, borderRadius: 4, padding: "1px 5px" }}>{org.genome_acc}</span>
                  : <span style={{ color: C.muted }}>-</span>}
              </td>
              <td style={tdStyle}>
                {org.bd_found
                  ? <span style={{ fontSize: 10, fontWeight: 600, color: C.confirmed, background: `${C.confirmed}18`, borderRadius: 999, padding: "2px 8px" }}>Yes</span>
                  : <span style={{ fontSize: 11, color: C.muted }}>No</span>}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: noveltyColor(org.nov) }}>
                {(org.nov || 0).toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function PaginationBar({ page, pages, onPage }) {
  const [jump, setJump] = useState(String(page))
  useEffect(() => { setJump(String(page)) }, [page])

  function commitJump() {
    const n = Number(jump)
    if (Number.isFinite(n) && n >= 1 && n <= pages) onPage(Math.floor(n))
    else setJump(String(page))
  }

  const btnStyle = { padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.fg, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }
  const disabledStyle = { ...btnStyle, opacity: 0.4, cursor: "not-allowed" }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => page > 1 && onPage(page - 1)} style={page <= 1 ? disabledStyle : btnStyle} disabled={page <= 1}>
          ← Previous
        </button>
        <button onClick={() => page < pages && onPage(page + 1)} style={page >= pages ? disabledStyle : btnStyle} disabled={page >= pages}>
          Next →
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted }}>
        <span>Page <strong style={{ color: C.fg }}>{page}</strong> of <strong style={{ color: C.fg }}>{pages || 1}</strong></span>
        <input
          type="number" min={1} max={pages || 1} value={jump}
          onChange={e => setJump(e.target.value)}
          onKeyDown={e => e.key === "Enter" && commitJump()}
          onBlur={commitJump}
          style={{ width: 56, height: 30, borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.fg, fontSize: 12, textAlign: "center", outline: "none" }}
        />
      </div>
    </div>
  )
}

// ── Phylum breakdown ─────────────────────────────────────────────────────────
function PhylumBreakdown({ phyla, loading, error }) {
  const [open, setOpen] = useState(true)
  const groups = (phyla || []).slice(0, 16)
  const maxCount = groups.length ? groups[0].count : 1

  return (
    <div style={{ borderTop: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", color: C.fg, textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>
            Phylum Breakdown - Confirmed Organisms
          </span>
          {phyla && (
            <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, background: "rgba(255,255,255,0.07)", borderRadius: 999, padding: "1px 7px" }}>
              {phyla.length} phyla
            </span>
          )}
        </div>
        <svg style={{ width: 14, height: 14, color: C.muted, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "4px 24px", padding: "4px 16px 20px" }}>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
              <div style={{ width: 110, height: 12, background: "#1e2740", borderRadius: 4 }} />
              <div style={{ flex: 1, height: 6, background: "#1e2740", borderRadius: 4 }} />
            </div>
          ))}
          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>Could not load phylum breakdown.</p>}
          {!loading && !error && groups.map(({ phylum, count }) => (
            <div key={phylum} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0" }}>
              <span style={{ width: 140, flexShrink: 0, fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={phylum}>
                {phylum}
              </span>
              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(count / maxCount) * 100}%`, height: "100%", background: C.confirmed, borderRadius: 999 }} />
              </div>
              <span style={{ width: 40, flexShrink: 0, textAlign: "right", fontSize: 11, fontWeight: 600, color: C.fg, fontVariantNumeric: "tabular-nums" }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, padding: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, padding: "8px 10px", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || C.fg, fontVariantNumeric: "tabular-nums" }}>{value ?? "-"}</div>
    </div>
  )
}

// ── Organism detail drawer ────────────────────────────────────────────────────
function OrganismDrawer({ name, onClose }) {
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!name) { setOrg(null); return }
    const controller = new AbortController()
    setLoading(true); setError(false)
    fetch(`${config.apiUrl}/organisms/by-name/${encodeURIComponent(name)}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json() })
      .then(d => { setOrg(d); setLoading(false) })
      .catch(err => {
        if (err.name !== "AbortError") { setError(true); setLoading(false) }
      })
    return () => controller.abort()
  }, [name])

  useEffect(() => {
    if (!name) return undefined
    previousFocusRef.current = document.activeElement
    const focusId = requestAnimationFrame(() => closeButtonRef.current?.focus())
    const onKeyDown = event => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab" || !drawerRef.current) return
      const focusable = [...drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter(element => !element.hasAttribute("hidden"))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      cancelAnimationFrame(focusId)
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [name, onClose])

  if (!name) return null

  const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)", zIndex: 300 }
  const drawerStyle = { position: "fixed", top: 0, right: 0, bottom: 0, width: "min(90vw, 900px)", background: "#0f1626", borderLeft: `1px solid ${C.border}`, overflowY: "auto", zIndex: 400, padding: "24px 20px" }

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div ref={drawerRef} style={drawerStyle} role="dialog" aria-modal="true" aria-label={`${name} organism profile`}>
        <button ref={closeButtonRef} onClick={onClose} aria-label="Close organism profile" style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>X</button>

        {loading && (
          <div style={{ paddingTop: 24 }}>
            {[200, 120, 300, 180].map((w, i) => (
              <div key={i} style={{ height: i === 0 ? 24 : 14, width: w, background: "#1e2740", borderRadius: 4, marginBottom: 12 }} />
            ))}
          </div>
        )}
        {error && <div style={{ paddingTop: 40, textAlign: "center", color: "#ef4444", fontSize: 13 }}>Failed to load organism. Try again.</div>}

        {!loading && !error && org && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.fg, fontStyle: "italic" }}>{org.name}</h2>
                <TierBadge tier={org.confidence_tier} />
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {org.genus || "Unknown genus"} / {org.phylum || "Unknown phylum"} / Tax ID {org.tax_id || "-"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16, alignItems: "start" }}>
              {/* Sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <SectionCard title="Summary">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <StatBox label="Bioplastic types" value={org.n_bio} color={C.confirmed} />
                    <StatBox label="Conventional types" value={org.n_conv} color={C.petblue} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    {[["Sequence", org.has_seq], ["Enzyme", org.has_enz], ["GenBank", org.has_gb]].map(([lbl, val]) => (
                      <span key={lbl} style={{ fontSize: 10, fontWeight: 600, borderRadius: 999, padding: "2px 8px", border: `1px solid ${val ? C.confirmed + "55" : C.border}`, background: val ? `${C.confirmed}18` : "transparent", color: val ? C.confirmed : C.muted }}>
                        {lbl} {val ? "yes" : "no"}
                      </span>
                    ))}
                  </div>
                  {org.iso_envs && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>Isolation environments</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {org.iso_envs.split(",").map(e => <span key={e} style={{ fontSize: 10, borderRadius: 999, background: "rgba(255,255,255,0.07)", padding: "1px 7px", color: C.fg }}>{e.trim()}</span>)}
                      </div>
                    </div>
                  )}
                  {org.iso_locs && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>Isolation locations</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {org.iso_locs.split(",").map(l => <span key={l} style={{ fontSize: 10, borderRadius: 999, background: "rgba(255,255,255,0.07)", padding: "1px 7px", color: C.fg }}>{l.trim()}</span>)}
                      </div>
                    </div>
                  )}
                  {(org.plastics || []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>Plastics</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {org.plastics.map((p, i) => <PlasticPill key={`${p}-${i}`} label={p} cls={(org.plastics_cls || [])[i]} />)}
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Genome">
                  {org.g_acc ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <StatBox label="Size" value={org.g_size || "-"} />
                        <StatBox label="Assembly level" value={org.g_level || "-"} />
                      </div>
                      <a href={`https://www.ncbi.nlm.nih.gov/datasets/genome/${org.g_acc}/`} target="_blank" rel="noreferrer" style={{ color: C.petblue, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                        {org.g_acc} ↗
                      </a>
                      <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 5, columnGap: 10, fontSize: 11, margin: 0 }}>
                        {[["Assembly name", org.g_name], ["N50", org.g_n50], ["Coverage", org.g_cov], ["NCBI Tax ID", org.g_taxid]].map(([k, v]) => (
                          <React.Fragment key={k}>
                            <dt style={{ color: C.muted }}>{k}</dt>
                            <dd style={{ textAlign: "right", fontFamily: "monospace", margin: 0 }}>{v || "-"}</dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    </div>
                  ) : <p style={{ fontSize: 12, color: C.muted }}>No genome assembly found.</p>}
                </SectionCard>

                <SectionCard title="BacDive Physiology">
                  {org.bd_found ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {org.bd_url && <a href={org.bd_url} target="_blank" rel="noreferrer" style={{ color: C.petblue, fontSize: 13, fontWeight: 600 }}>BacDive record {org.bd_id ? `#${org.bd_id}` : ""} ↗</a>}
                      <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 5, columnGap: 10, fontSize: 11, margin: 0 }}>
                        {[["Culture temp", org.bd_temp], ["pH", org.bd_ph], ["Oxygen tolerance", org.bd_oxy], ["Morphology", org.bd_morph], ["Isolation source", org.bd_iso]].map(([k, v]) => (
                          <React.Fragment key={k}>
                            <dt style={{ color: C.muted }}>{k}</dt>
                            <dd style={{ textAlign: "right", margin: 0 }}>{v || "-"}</dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    </div>
                  ) : <p style={{ fontSize: 12, color: C.muted }}>Not found in BacDive.</p>}
                </SectionCard>
              </div>

              {/* Main content */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                {/* Research charts */}
                {((org.ch_pl_labels || []).length > 0 || (org.ch_yr_labels || []).length > 0 ||
                  (org.ch_ev_labels || []).length > 0 || (org.ch_fam_labels || []).length > 0) && (
                  <SectionCard title="Research Overview">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
                      {(org.ch_pl_labels || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Plastics studied</div>
                          <ResponsiveContainer width="100%" height={Math.max(120, org.ch_pl_labels.length * 28)}>
                            <BarChart data={org.ch_pl_labels.map((l, i) => ({ name: l, value: (org.ch_pl_values || [])[i], color: (org.ch_pl_colors || [])[i] || C.petblue }))} layout="vertical" margin={{ left: 4, right: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                              <XAxis type="number" tick={CHART_TICK} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="name" tick={CHART_TICK} width={80} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ background: "#1a2235", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {org.ch_pl_labels.map((_, i) => <Cell key={i} fill={(org.ch_pl_colors || [])[i] || C.petblue} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {(org.ch_yr_labels || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Publications by year</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={org.ch_yr_labels.map((l, i) => ({ name: l, value: (org.ch_yr_values || [])[i] }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                              <XAxis dataKey="name" tick={CHART_TICK} axisLine={false} tickLine={false} />
                              <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ background: "#1a2235", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                              <Bar dataKey="value" fill={C.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {(org.ch_ev_labels || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Evidence methods</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={org.ch_ev_labels.map((l, i) => ({ name: l, value: (org.ch_ev_values || [])[i] }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                              <XAxis dataKey="name" tick={CHART_TICK} axisLine={false} tickLine={false} />
                              <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ background: "#1a2235", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                              <Bar dataKey="value" fill={C.confirmed} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {(org.ch_fam_labels || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Enzyme families</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={org.ch_fam_labels.map((l, i) => ({ name: l, value: (org.ch_fam_values || [])[i] }))} dataKey="value" nameKey="name" innerRadius={30} outerRadius={55} paddingAngle={2}>
                                {org.ch_fam_labels.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ background: "#1a2235", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Novelty score */}
                <SectionCard title="Novelty Score">
                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: noveltyColor(org.nov || 0) }}>{(org.nov || 0).toFixed(0)}</span>
                      <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>/ 100</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {[["Substrate breadth", org.nov_breadth], ["Rarity", org.nov_rarity], ["Recency", org.nov_recency], ["Evidence gap", org.nov_gap]].map(([lbl, val]) => (
                        <div key={lbl}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: C.muted }}>{lbl}</span>
                            <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{val != null ? Number(val).toFixed(0) : "-"}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                            <div style={{ width: `${val || 0}%`, height: "100%", background: noveltyColor(val || 0), borderRadius: 999 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* PlasticDB entries */}
                <SectionCard title="PlasticDB Entries">
                  {(org.entries || []).length > 0 ? (
                    <div style={{ maxHeight: 280, overflowY: "auto", borderRadius: 6, border: `1px solid ${C.border}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr>
                            {["Plastic", "Year", "Enzyme", "Family", "Seq", "GenBank", "Environment", "Location", "DOI"].map(h => (
                              <th key={h} style={{ ...thStyle, fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {org.entries.map((e, i) => (
                            <tr key={i}>
                              <td style={tdStyle}><PlasticPill label={e.pl} cls={e.cls} /></td>
                              <td style={{ ...tdStyle, fontFamily: "monospace" }}>{e.yr || "-"}</td>
                              <td style={tdStyle}>{e.enz || "-"}</td>
                              <td style={tdStyle}>{e.fam || "-"}</td>
                              <td style={tdStyle}>{e.seq ? <span style={{ color: C.confirmed, fontSize: 10, fontWeight: 600 }}>yes</span> : <span style={{ color: C.muted, fontSize: 10 }}>no</span>}</td>
                              <td style={tdStyle}>{e.gb ? <span style={{ color: C.petblue, fontSize: 10, fontWeight: 600 }}>yes</span> : <span style={{ color: C.muted, fontSize: 10 }}>no</span>}</td>
                              <td style={tdStyle}>{e.env || "-"}</td>
                              <td style={tdStyle}>{e.loc || "-"}</td>
                              <td style={tdStyle}>
                                {e.doi
                                  ? <a href={e.doi.startsWith("http") ? e.doi : `https://doi.org/${e.doi}`} target="_blank" rel="noreferrer" style={{ color: C.petblue }}>↗</a>
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p style={{ fontSize: 12, color: C.muted }}>No PlasticDB entries recorded.</p>}
                </SectionCard>

                {/* Temperature + PubMed */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
                  <SectionCard title="Temperature Profile">
                    <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "4px 10px", border: `1px solid ${C.border}`, display: "inline-block", marginBottom: 8, color: org.is_thermo ? "#ef4444" : org.is_rt ? C.predicted : C.petblue, background: org.is_thermo ? "rgba(239,68,68,0.12)" : org.is_rt ? `${C.predicted}18` : `${C.petblue}18` }}>
                      {org.is_thermo ? "Thermophile" : org.is_rt ? "Room-temperature active" : "Mesophile"}
                    </span>
                    {org.is_rt && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <StatBox label="RT max (°C)" value={org.rt_max ?? "-"} />
                        <StatBox label="RT mean (°C)" value={org.rt_mean != null ? Number(org.rt_mean).toFixed(1) : "-"} />
                      </div>
                    )}
                  </SectionCard>
                  <SectionCard title="PubMed">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <StatBox label="Plastic papers" value={org.pm_plastic} color={C.primary} />
                      <StatBox label="Total papers" value={org.pm_total} />
                    </div>
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(org.name)}`} target="_blank" rel="noreferrer" style={{ color: C.petblue, fontSize: 12, fontWeight: 600 }}>
                      Search PubMed ↗
                    </a>
                  </SectionCard>
                </div>

                {/* ProtParam */}
                {(org.pp || []).length > 0 && (
                  <SectionCard title="ProtParam">
                    <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.border}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr>
                            {["Plastic", "Length", "MW (kDa)", "pI", "Instability", "GRAVY", "Stable"].map(h => (
                              <th key={h} style={{ ...thStyle, fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {org.pp.map((p, i) => (
                            <tr key={i}>
                              <td style={tdStyle}><PlasticPill label={p.plastic} /></td>
                              <td style={{ ...tdStyle, fontFamily: "monospace" }}>{p.sl}</td>
                              <td style={{ ...tdStyle, fontFamily: "monospace" }}>{p.mw}</td>
                              <td style={{ ...tdStyle, fontFamily: "monospace" }}>{p.pi}</td>
                              <td style={{ ...tdStyle, fontFamily: "monospace" }}>{p.ii}</td>
                              <td style={{ ...tdStyle, fontFamily: "monospace" }}>{p.gravy}</td>
                              <td style={tdStyle}>{p.stable
                                ? <span style={{ fontSize: 10, fontWeight: 600, color: C.confirmed }}>stable</span>
                                : <span style={{ fontSize: 10, fontWeight: 600, color: "#ef4444" }}>unstable</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {/* SRA */}
                <SectionCard title="Sequence Read Archive">
                  {(org.sra_rc || 0) > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <StatBox label="SRA runs" value={fmt(org.sra_rc)} color={C.petblue} />
                        <StatBox label="Bases" value={org.sra_bases || "-"} />
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Date range: <span style={{ fontFamily: "monospace", color: C.fg }}>{org.sra_dates || "-"}</span></p>
                      {org.sra_plat && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {org.sra_plat.split(",").map(p => <span key={p} style={{ fontSize: 10, fontWeight: 600, color: C.petblue, background: `${C.petblue}18`, borderRadius: 999, padding: "1px 8px" }}>{p.trim()}</span>)}
                        </div>
                      )}
                      {org.sra_strat && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {org.sra_strat.split(",").map(s => <span key={s} style={{ fontSize: 10, fontWeight: 600, color: C.muted, background: "rgba(255,255,255,0.07)", borderRadius: 999, padding: "1px 8px" }}>{s.trim()}</span>)}
                        </div>
                      )}
                    </div>
                  ) : <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No SRA runs found.</p>}
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const API = config.apiUrl

export default function OrganismsPage({ location }) {
  const [qs, setQs] = useState(() => parseQS())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [phyla, setPhyla] = useState(null)
  const [phylaLoading, setPhylaLoading] = useState(true)
  const [phylaError, setPhylaError] = useState(false)

  // Sync URL → state when Gatsby navigation changes location
  useEffect(() => {
    setQs(parseQS())
  }, [location && location.search])

  // Fetch organism list
  useEffect(() => {
    const first = !data
    if (first) setLoading(true)
    else setFetching(true)
    setError(false)

    const params = new URLSearchParams()
    params.set("page", String(qs.page || 1))
    params.set("per_page", "50")
    if (qs.q)                       params.set("q", qs.q)
    if (qs.filter && qs.filter !== "all") params.set("filter", qs.filter)
    if (qs.tier && qs.tier !== "all")     params.set("tier", qs.tier)
    if (qs.sort && qs.sort !== "name")    params.set("sort", qs.sort)

    const controller = new AbortController()
    fetch(`${API}/organisms?${params}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error("error"); return r.json() })
      .then(d => { setData(d); setLoading(false); setFetching(false) })
      .catch(err => {
        if (err.name !== "AbortError") { setError(true); setLoading(false); setFetching(false) }
      })
    return () => controller.abort()
  }, [qs.q, qs.filter, qs.tier, qs.sort, qs.page])

  // Fetch stats once
  useEffect(() => {
    fetch(`${API}/organisms/stats`)
      .then(r => { if (!r.ok) throw new Error("error"); return r.json() })
      .then(d => { setStats(d); setStatsLoading(false) })
      .catch(() => { setStatsError(true); setStatsLoading(false) })
  }, [])

  // Fetch phylum once
  useEffect(() => {
    fetch(`${API}/organisms/phylum`)
      .then(r => { if (!r.ok) throw new Error("error"); return r.json() })
      .then(d => { setPhyla(d.phyla); setPhylaLoading(false) })
      .catch(() => { setPhylaError(true); setPhylaLoading(false) })
  }, [])

  function update(patch) {
    setQs(prev => ({ ...prev, ...patch }))
    pushQS(patch)
  }
  function handleQuery(q)   { update({ q, page: 1 }) }
  function handleFilter(f)  { update({ filter: f, page: 1 }) }
  function handleTier(t)    { update({ tier: t, page: 1 }) }
  function handleSort(s)    { update({ sort: s, page: 1 }) }
  function handlePage(p)    { update({ page: p }); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }) }
  function handleSelect(n)  { update({ org: n }) }
  function handleClose()    { update({ org: null }) }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.bg, color: C.fg, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}`, background: `${C.card}99`, padding: "16px 20px" }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C.primary}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth={2}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx={12} cy={12} r={3} />
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.fg }}>
            PETadex <span style={{ fontWeight: 400, color: C.muted }}>/ Organism Atlas</span>
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
            Reference index of plastic-degrading and plastic-associated microorganisms
          </p>
        </div>
      </div>

      <StatsBar stats={stats} loading={statsLoading} error={statsError} />

      <Toolbar
        query={qs.q} onQuery={handleQuery}
        filter={qs.filter} onFilter={handleFilter}
        tier={qs.tier} onTier={handleTier}
        sort={qs.sort} onSort={handleSort}
        total={data?.total} fetching={fetching}
      />

      <OrganismsTable organisms={data?.organisms} loading={loading} error={error} onSelect={handleSelect} />

      {data && data.pages > 1 && <PaginationBar page={data.page} pages={data.pages} onPage={handlePage} />}

      <PhylumBreakdown phyla={phyla} loading={phylaLoading} error={phylaError} />

      <OrganismDrawer name={qs.org} onClose={handleClose} />
    </div>
  )
}

export const Head = () => (
  <Seo
    title="Organism Atlas"
    description="Browse 2.9M plastic-degrading and plastic-associated microorganisms in the PETadex Organism Atlas"
  />
)
