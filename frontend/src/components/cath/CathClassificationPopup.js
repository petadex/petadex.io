import React, { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "petadex:cathDomainIntroDismissed"

// widthPct controls the taper — each step narrower than the last, creating the funnel shape
const FUNNEL_STEPS = [
  { label: "Billions of sequences", widthPct: 100 },
  { label: "HMM scanning", widthPct: 78 },
  { label: "42 atlas components", widthPct: 52 },
  { label: "CATH domains", widthPct: 28 },
]

/** Shown once per browser on the CAT-domain view. Dismissal is permanent via localStorage, only
 *  on an explicit "don't show again" check - not just closing the popup. */
const CathClassificationPopup = () => {
  const [dismissed, setDismissed] = useState(true) // starts hidden; set from storage in the effect below
  const [dontShowChecked, setDontShowChecked] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      setDismissed(stored === "true")
    } catch {
      // localStorage unavailable (privacy mode, etc.) — just show the popup every time
      setDismissed(false)
    }
  }, [])

  const handleClose = useCallback(() => {
    if (dontShowChecked && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, "true")
      } catch {
        // ignore write failures
      }
    }
    setDismissed(true)
  }, [dontShowChecked])

  if (dismissed) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Why CATH domains"
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 rounded-2xl"
    >
      <div className="bg-card border border-border rounded-2xl p-8 max-w-2xl w-full">
        <div className="flex flex-col items-center gap-2 mb-6">
          {FUNNEL_STEPS.map((step, i) => {
            const isLast = i === FUNNEL_STEPS.length - 1
            const shadeClass = isLast
              ? "bg-accent"
              : ["bg-muted/70", "bg-muted/55", "bg-muted/40"][i] || "bg-muted/40"
            return (
              <div
                key={step.label}
                className={`funnel-step flex items-center justify-center text-center py-3 ${shadeClass}`}
                style={{
                  width: `${step.widthPct}%`,
                  clipPath: isLast
                    ? "polygon(8% 0%, 92% 0%, 82% 100%, 18% 100%)"
                    : `polygon(4% 0%, 96% 0%, ${100 - (100 - (FUNNEL_STEPS[i + 1].widthPct / step.widthPct) * 100) / 2}% 100%, ${(100 - (FUNNEL_STEPS[i + 1].widthPct / step.widthPct) * 100) / 2}% 100%)`,
                  animationDelay: `${i * 120}ms`,
                }}
              >
                <span
                  className={`text-sm font-medium px-2 ${
                    isLast ? "text-accent-foreground" : "text-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          PETadex scans an enormous number of raw sequences. Classifying by structural fold
          compresses that into a small number of CATH domains — few enough that someone can
          actually curate and read one page per domain, with every raw hit inheriting that
          domain's mechanism and literature.
        </p>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowChecked}
              onChange={e => setDontShowChecked(e.target.checked)}
              className="w-auto"
            />
            Don&rsquo;t show this again
          </label>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-medium px-5 py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>

      <style>{`
        .funnel-step {
          opacity: 0;
          animation: funnelFadeIn 0.4s ease-out forwards;
        }
        @keyframes funnelFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default CathClassificationPopup
