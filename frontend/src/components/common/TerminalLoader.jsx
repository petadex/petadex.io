import React, { useEffect, useState } from "react"

export const LOADING_PROMPTS = [
  "bribing PETases to reveal their secrets...",
  "untangling 300 million sequences...",
  "asking terephthalate if it's okay...",
  "running ESM-2 (just kidding, cached)",
  "negotiating with polyethylene...",
  "querying the metagenome (it's complicated)",
  "converting plastic guilt into scatter plots...",
  "checking if BHET is still a substrate...",
  "phylogenetic tree is loading (it's big)",
  "Artem approved this loading screen",
]

const TerminalLoader = ({ loading, title, lines = [] }) => {
  const [visible,  setVisible]  = useState(loading)
  const [fading,   setFading]   = useState(false)
  // The first render must match the server-rendered HTML, so it always starts on prompt 0;
  // a random start is picked after mount. (Picking it with Math.random() in the initial state
  // made the server and the browser disagree ~9 times in 10, which failed React hydration and
  // forced a full client re-render of the page.)
  const [promptIdx, setPromptIdx] = useState(0)
  const [progress,  setProgress]  = useState(0)

  useEffect(() => {
    setPromptIdx(Math.floor(Math.random() * LOADING_PROMPTS.length))
    const interval = setInterval(() => {
      setPromptIdx(i => (i + 1) % LOADING_PROMPTS.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const start = Date.now()
    const duration = 3200
    let raf
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      setProgress((1 - Math.pow(1 - t, 2)) * 85)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!loading) {
      setProgress(100)
      const t = setTimeout(() => setFading(true), 350)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!visible) return null

  const filled = Math.round(progress / 100 * 20)
  const bar = "█".repeat(filled) + "░".repeat(20 - filled)

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(10, 15, 28, 0.96)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.55s ease",
      }}
      onTransitionEnd={() => { if (fading) setVisible(false) }}
    >
      <div style={{ fontFamily: "'Courier New', Courier, monospace", maxWidth: "400px", width: "88%" }}>
        {title && (
          <div style={{ color: "#334155", fontSize: "11px", marginBottom: "20px", letterSpacing: "0.1em" }}>
            {title}
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} style={{ marginBottom: "8px", fontSize: "13px" }}>
            <span style={{ color: "#475569" }}>›</span>{" "}
            <span style={{ color: i === 0 ? "#e2e8f0" : "#94a3b8" }}>{line}</span>
          </div>
        ))}
        <div style={{ marginBottom: "22px", fontSize: "13px" }}>
          <span style={{ color: "#475569" }}>›</span>{" "}
          <span style={{ color: "#64748b" }}>{LOADING_PROMPTS[promptIdx]}</span>
        </div>
        <div style={{ fontSize: "13px" }}>
          <span style={{ color: "#475569" }}>›</span>{" "}
          <span style={{ color: "#4ecdc4" }}>[{bar}]</span>{" "}
          <span style={{ color: "#64748b" }}>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  )
}

export default TerminalLoader
