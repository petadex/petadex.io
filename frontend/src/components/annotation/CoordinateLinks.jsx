// frontend/src/components/annotation/CoordinateLinks.jsx
//
// A stated lat_lon with links to view it on a full map. Used wherever
// coordinates are shown, alongside (not instead of) the embedded pin map.
import React from "react"
import { osmUrl, googleMapsUrl } from "../../utils/annotation"

const link = "text-xs text-info hover:underline whitespace-nowrap"

/** @param {{ latitude: number, longitude: number }} props */
export default function CoordinateLinks({ latitude, longitude }) {
  if (latitude == null || longitude == null) return null
  const lat = Number(latitude)
  const lon = Number(longitude)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-mono text-sm">
        {lat.toFixed(4)}, {lon.toFixed(4)}
      </span>
      <a
        href={osmUrl(lat, lon)}
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        OpenStreetMap ↗
      </a>
      <a
        href={googleMapsUrl(lat, lon)}
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        Google Maps ↗
      </a>
    </span>
  )
}
