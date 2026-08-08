import React from "react"
import FoldingViewer from "./structure/FoldingViewer"

/**
 * Unified 3D structure panel — delegates to Folding Viewer (Alex board).
 */
export default function StructurePanel(props) {
  return <FoldingViewer {...props} />
}
