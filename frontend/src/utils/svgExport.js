/**
 * A standalone copy of an on-page SVG figure, for download. The page draws
 * with CSS variables and Tailwind classes, which mean nothing outside it, so
 * every var(--token) is resolved against the light theme (a figure for a
 * paper or slide, whatever theme the reader browses in) and converted to hex,
 * which every SVG editor reads; oklch is not.
 */

// Classes the figures use for type; everything else is layout or behaviour.
const TYPE_STYLE = `
  text { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .font-mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
`

/** Any CSS color as #rrggbb (or #rrggbbaa), through a 1×1 canvas. */
function toHex(ctx, color) {
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = "#000"
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  const hex = [r, g, b, ...(a < 255 ? [a] : [])]
    .map(v => v.toString(16).padStart(2, "0"))
    .join("")
  return `#${hex}`
}

/** `svg`'s markup with every var(--token) replaced by its light-theme hex. */
export function standaloneSvg(svg) {
  const probe = document.createElement("div")
  probe.className = "light"
  probe.style.display = "none"
  document.body.appendChild(probe)
  const styles = getComputedStyle(probe)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })

  const clone = svg.cloneNode(true)
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  const [, , w, h] = (clone.getAttribute("viewBox") || "0 0 1000 1000")
    .split(/\s+/)
    .map(Number)
  clone.setAttribute("width", w)
  clone.setAttribute("height", h)
  clone.removeAttribute("class")
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style")
  style.textContent = TYPE_STYLE
  clone.insertBefore(style, clone.firstChild)

  const resolved = new Map()
  const markup = new XMLSerializer()
    .serializeToString(clone)
    .replace(/var\((--[\w-]+)\)/g, (_, name) => {
      if (!resolved.has(name)) {
        const value = styles.getPropertyValue(name).trim()
        resolved.set(name, value ? toHex(ctx, value) : "#000000")
      }
      return resolved.get(name)
    })
  probe.remove()
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`
}
