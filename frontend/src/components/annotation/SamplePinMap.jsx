// frontend/src/components/annotation/SamplePinMap.jsx
//
// One pin at a BioSample's stated lat_lon. Only mounted when both coordinates
// are non-null (32 % of hits), so the map is a sometimes-feature by design.
// Same vector Positron style as MetadataMap.js: CARTO's unauthenticated raster
// tiles now carry an "API KEY" watermark.
// If WebGL is unavailable the coordinates are still shown as text.
import React, { useEffect, useRef, useState } from "react"
import "maplibre-gl/dist/maplibre-gl.css"

const STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

/** @param {{ latitude: number, longitude: number, heightClass?: string }} props */
export default function SamplePinMap({
  latitude,
  longitude,
  heightClass = "h-56",
}) {
  const containerRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return
    const maplibregl = require("maplibre-gl")
    let map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE,
        center: [longitude, latitude],
        zoom: 3,
        pixelRatio: 1,
        attributionControl: { compact: true },
      })
    } catch {
      setFailed(true)
      return
    }
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    )
    new maplibregl.Marker({ color: "#0f766e" })
      .setLngLat([longitude, latitude])
      .addTo(map)
    return () => map.remove()
  }, [latitude, longitude])

  return (
    <div
      className={`relative w-full ${heightClass} rounded-lg border border-border overflow-hidden`}
    >
      {/* w/h-full rather than absolute inset-0 — see MetadataMap.js for why. */}
      <div ref={containerRef} className="w-full h-full" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface text-sm text-muted-foreground">
          Map unavailable on this device
        </div>
      )}
    </div>
  )
}
