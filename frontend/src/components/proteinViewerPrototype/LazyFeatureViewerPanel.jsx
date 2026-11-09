import React, { useEffect, useState } from "react"

/**
 * Client-only code-split wrapper for the heavy FeatureViewerPanel (nightingale feature-viewer),
 * so it stays out of page entry chunks and only loads when a viewer is actually opened.
 */
export default function LazyFeatureViewerPanel(props) {
  const [Panel, setPanel] = useState(/** @type {React.ComponentType<any> | null} */ (null))

  useEffect(() => {
    let cancelled = false
    import(
      /* webpackChunkName: "feature-viewer-panel" */
      "./FeatureViewerPanel.jsx"
    ).then(mod => {
      if (!cancelled) setPanel(() => mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!Panel) {
    return (
      <div className="text-sm text-muted-foreground py-4">Loading feature viewer…</div>
    )
  }

  return <Panel {...props} />
}
