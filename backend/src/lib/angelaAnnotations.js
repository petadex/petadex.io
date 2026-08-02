// Angela sequence-annotation helpers (SignalP6 / DeepLoc / biochem).
// SignalP is live on the old DB; DeepLoc + biochem soft-fail until loaded.

/** SignalP6 top_signal encoding (issue #94). OTHER=0 is not stored in the table. */
export const SIGNALP_LABELS = {
  0: 'OTHER',
  1: 'SP',
  2: 'LIPO',
  3: 'TAT',
  4: 'TATLIPO',
  5: 'PILIN',
}

export const SIGNALP_DESCRIPTIONS = {
  0: 'No signal peptide (OTHER)',
  1: 'Sec/SPI signal peptide (SP)',
  2: 'Sec/SPII lipoprotein signal peptide (LIPO)',
  3: 'Tat/SPI signal peptide (TAT)',
  4: 'Tat/SPII lipoprotein signal peptide (TATLIPO)',
  5: 'Sec/SPIII pilin signal peptide (PILIN)',
}

/**
 * @param {import('pg').Pool} pool
 * @param {string[]} names
 * @returns {Promise<Record<string, boolean>>}
 */
export async function tableExistsMap(pool, names) {
  const { rows } = await pool.query(
    `SELECT c.relname
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = ANY($1::text[])
       AND c.relkind IN ('r', 'v', 'm', 'p')`,
    [names],
  )
  const found = new Set(rows.map(r => r.relname))
  return Object.fromEntries(names.map(n => [n, found.has(n)]))
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} orfId
 */
export async function fetchSignalpPrediction(pool, orfId) {
  try {
    const { rows } = await pool.query(
      `SELECT orf_id, top_signal, signal_prob, cleavage_pos, cleavage_prob
       FROM signalp6_orf_predictions
       WHERE orf_id = $1
       LIMIT 1`,
      [orfId],
    )
    const row = rows[0]
    if (!row) return { available: true, prediction: null }
    const top = Number(row.top_signal)
    return {
      available: true,
      prediction: {
        orf_id: Number(row.orf_id),
        top_signal: top,
        label: SIGNALP_LABELS[top] ?? `UNKNOWN_${top}`,
        description: SIGNALP_DESCRIPTIONS[top] ?? null,
        signal_prob: row.signal_prob != null ? Number(row.signal_prob) : null,
        cleavage_pos: row.cleavage_pos != null ? Number(row.cleavage_pos) : null,
        cleavage_prob: row.cleavage_prob != null ? Number(row.cleavage_prob) : null,
        source: 'signalp6_orf_predictions',
      },
    }
  } catch (err) {
    if (err.code === '42P01') {
      return { available: false, prediction: null, reason: 'table_missing' }
    }
    throw err
  }
}

/**
 * Stub until deeploc21_orf_predictions is loaded after the next DB update.
 * @param {import('pg').Pool} pool
 * @param {number} orfId
 */
export async function fetchDeeplocPrediction(pool, orfId) {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM deeploc21_orf_predictions
       WHERE orf_id = $1
       LIMIT 1`,
      [orfId],
    )
    if (!rows[0]) return { available: true, prediction: null }
    return { available: true, prediction: rows[0], source: 'deeploc21_orf_predictions' }
  } catch (err) {
    if (err.code === '42P01') {
      return {
        available: false,
        prediction: null,
        reason: 'table_missing',
        note: 'Pending DB update + Angela DeepLoc load (igem-toronto #95).',
      }
    }
    throw err
  }
}

/**
 * Stub until orf_biochemical_properties is loaded after the next DB update.
 * @param {import('pg').Pool} pool
 * @param {number} orfId
 */
export async function fetchBiochemProperties(pool, orfId) {
  try {
    const { rows } = await pool.query(
      `SELECT orf_id, sequence_length, molecular_weight, isoelectric_point,
              gravy_score, instability_index, aromaticity, calc_status,
              noncanonical_residues
       FROM orf_biochemical_properties
       WHERE orf_id = $1
       LIMIT 1`,
      [orfId],
    )
    if (!rows[0]) return { available: true, properties: null }
    return { available: true, properties: rows[0], source: 'orf_biochemical_properties' }
  } catch (err) {
    if (err.code === '42P01') {
      return {
        available: false,
        properties: null,
        reason: 'table_missing',
        note: 'Pending DB update + Angela ProtParam load (igem-toronto #96).',
      }
    }
    throw err
  }
}
