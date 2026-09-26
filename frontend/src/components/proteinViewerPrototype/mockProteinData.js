/**
 * Shared mock annotation tracks for comparing Nightingale vs feature-viewer.
 * Coordinates are defined on a 223 aa template and scaled to any sequence length.
 */

/** Template length used for LOGICAL_TRACKS_TEMPLATE coordinates. */
export const TEMPLATE_LENGTH = 223

/** Long illustrative string; demo uses first `TEMPLATE_LENGTH` residues. */
const RAW_SEQUENCE =
  "MKTIIALSYIFCLVFADYKDDDDKGGGGSGGGGSGGGGSELNLVQKKLEHAEPVASPHQAERRVLGSWDASSWFEHQDTIYLKPGSWMISHWKGPKYLEGGSVDEIVPDLRLDVNGNVVAIRNYGFYYGVVKTTDWNYDDINKTFNLTLAKAVSRKGFSWNVSGRNFVTMPGFKYDKIVTVVDEGVPNEVRNVTFKGVTTYKKVVDDMYEMASKKTDDVSVEARWMFPKPCKKVEFEGTVDTEGGYKIKKTTPKKPKTVKKDDKPNEAVDESSSAENDTGSWGSGMSGKGVDLSGDAAAVTVAAAVTLAKSGGGGGGSLSGGGGSKNLMAIIAKGLSDLKKIAELKKSDLDDAKVLSAVDKVLDSMLSGSGGGGGGGGGGGGGGGNLAAVDDAQQKSFGGFDSGFASSWDEVNYDWKAFSNFVDGLSGSGGGGGGGGGGGGGGLSGWSGGGGGGGGGGGGGGGGGSGGSGSHHHHHHHHHHHHHAIAEGSDSGGGGGGGGGGGGGGGGGSWDEVNYDWKAFSNFVDGLSGSGGGGGGGGGGGGGGGLSGWSGGGGGGGGGGGGGGGGGSGGSGSHHHHHHHHHHHHHAIAEGSDSGGGGGGGGGGGGGGGGGWDEVNYDWKAFSNFVDGLSGSGGGGGGGGGGGGGGGLSGWSGGGGGGGGGGGGGGGGGSGGSGSHHHHHHHHHHHHHAIAEGSDSGGGGGGGGGGGGGGGGG"

/** Built-in demo sequence (same length as template). */
export const DEMO_SEQUENCE = RAW_SEQUENCE.slice(0, TEMPLATE_LENGTH)

/** @deprecated use DEMO_SEQUENCE */
export const SEQUENCE = DEMO_SEQUENCE

/**
 * Relative annotation layout (coordinates match TEMPLATE_LENGTH).
 */
const LOGICAL_TRACKS_TEMPLATE = [
  {
    id: "domains",
    title: "Domains / families",
    features: [
      { label: "PETase-like domain", start: 12, end: 118, color: "#2e7dd6" },
      { label: "Accessory segment", start: 145, end: 210, color: "#5a9e3e" },
    ],
  },
  {
    id: "motifs",
    title: "Motifs / sites",
    features: [
      { label: "Active site", start: 46, end: 52, color: "#c45c2a" },
      { label: "Binding pocket", start: 164, end: 178, color: "#8e44ad" },
      { label: "Disulfide", start: 88, end: 88, color: "#16a085" },
    ],
  },
  {
    id: "regions",
    title: "Regions",
    features: [
      { label: "Signal / transit", start: 1, end: 24, color: "#95a5a6" },
      { label: "Core catalytic", start: 30, end: 190, color: "#3498db" },
      { label: "C-terminal tail", start: 198, end: TEMPLATE_LENGTH, color: "#e67e22" },
    ],
  },
]

function scaleInterval(start, end, targetLen) {
  const L = Math.max(1, targetLen)
  const scale = L / TEMPLATE_LENGTH
  let s = Math.max(1, Math.round(start * scale))
  let e = Math.min(L, Math.max(s, Math.round(end * scale)))
  if (e < s) e = s
  return { start: s, end: e }
}

/** Scaled logical tracks for a given protein length (same labels, adjusted coordinates). */
export function logicalTracksForSequenceLength(sequenceLength) {
  const len = Math.max(1, sequenceLength)
  return LOGICAL_TRACKS_TEMPLATE.map(track => ({
    ...track,
    features: track.features.map(f => {
      const { start, end } = scaleInterval(f.start, f.end, len)
      return { ...f, start, end }
    }),
  }))
}

/** feature-viewer `addFeature` payloads — one object per track row. */
export function featureViewerTrackDefinitions(sequenceLength) {
  const len = sequenceLength ?? TEMPLATE_LENGTH
  return logicalTracksFromTemplate(len).map(track => featureViewerRectTrack(track))
}

/** Same coordinate space as {@link logicalTracksForSequenceLength} (scaled mock). */
export function logicalTracksFromTemplate(sequenceLength) {
  return logicalTracksForSequenceLength(sequenceLength)
}

function featureViewerRectTrack(track) {
  return {
    id: track.id,
    title: track.title,
    feature: {
      data: track.features.map(f => ({
        x: f.start,
        y: f.end,
        description: `${f.label} (${f.start}–${f.end})`,
      })),
      name: track.title,
      className: `fv-track-${track.id}`,
      color: track.features[0]?.color ?? "#2e7dd6",
      type: "rect",
    },
  }
}

/** @param {ReturnType<typeof logicalTracksForSequenceLength>} tracks */
export function featureViewerDefsFromLogicalTracks(tracks) {
  return tracks.map(featureViewerRectTrack)
}
