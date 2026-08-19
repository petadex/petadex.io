/**
 * DOIs contain `/`, which breaks single-segment Gatsby routes if URL-encoded as %2F
 * (browsers often treat that as a real slash). Use `~` as a path-safe stand-in.
 */
export function doiToPathSegment(doi) {
  return String(doi || "")
    .trim()
    .replace(/\~/g, "%7E")
    .replace(/\//g, "~")
}

export function pathSegmentToDoi(segment) {
  return String(segment || "")
    .trim()
    .replace(/~/g, "/")
    .replace(/%7E/gi, "~")
}

export function paperPath(doi) {
  return `/paper/${doiToPathSegment(doi)}`
}
