import annotatedResidues from "./annotatedResidues.json"

/**
 * @typedef {{
 *   accession: string,
 *   displayName?: string,
 *   stylePreset?: { cartoonColor?: string, annotationColor?: string, labelColor?: string },
 *   groups?: Array<{ id: string, label: string, color?: string }>,
 *   residues: Array<{ seqPos: number, aa?: string, group?: string, label?: string, note?: string }>,
 * }} AnnotationRecord
 */

/** @type {AnnotationRecord[]} */
const RECORDS = Array.isArray(annotatedResidues?.records)
  ? annotatedResidues.records
  : []

const BY_ACCESSION = new Map(RECORDS.map(r => [r.accession, r]))

/** @param {string | undefined | null} accession */
export function annotationRecordForAccession(accession) {
  if (!accession) return null
  return BY_ACCESSION.get(accession) ?? null
}
