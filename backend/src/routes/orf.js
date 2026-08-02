// backend/src/routes/orf.js
//
// Corpus sequence-page API (the 307M-ORF path). Implements the plan in
// "02 - Backend Routing Plan":
//
//   GET /api/orf/:orfId              first-paint payload: sequence (S3 Range read
//                                    via orf_offset) + tier (orf_origins) +
//                                    ancestors (petadex_clustering) + computed
//                                    stats + provenance (dispatched on orf_origin,
//                                    folded in per "03 - Frontend Wiring").
//   GET /api/orf/:orfId/provenance   provenance block alone.
//
// All reads are by orf_id primary key (sub-ms); the only variable cost is the
// single S3 Range read. Degrades gracefully: if S3 is unreachable the route
// still returns tier + ancestors + provenance and reports `sequence_error`.
import { Router } from 'express'
import Joi from 'joi'
import { pool } from '../db.js'
import { fetchOrfSequence } from '../lib/orfSequence.js'
import { computeSeqStats } from '../lib/seqStats.js'
import { fetchProvenance } from '../lib/orfProvenance.js'
import {
  fetchSignalpPrediction,
  fetchDeeplocPrediction,
  fetchBiochemProperties,
} from '../lib/angelaAnnotations.js'

const router = Router()

const orfIdSchema = Joi.number().integer().min(1).required()

const ORIGIN_LABELS = { 0: 'PAZy', 1: 'NR', 2: 'Logan' }

/** Normalize a Postgres text[] (array or "{a,b}" string) to a JS string array. */
function pgArray(value) {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value.map(v => String(v).replace(/^'+|'+$/g, '').trim()).filter(Boolean)
  }
  const inner = String(value).match(/^\{(.*)\}$/)
  const body = inner ? inner[1] : String(value)
  return body
    .split(',')
    .map(v => v.replace(/^["']+|["']+$/g, '').trim())
    .filter(Boolean)
}

/** Core lookup shared by both routes: tier + offsets + ancestor cluster path. */
async function fetchOrfCore(orfId) {
  const { rows } = await pool.query(
    `SELECT o.orf_origin, o.date_retrieval,
            off.byte_offset, off.byte_length,
            c."90pid_enzyme_id"      AS c90_id,
            c."60pid_family_id"      AS c60_id,
            c."30pid_superfamily_id" AS c30_id
     FROM orf_origins o
     LEFT JOIN orf_offset off ON off.orf_id = o.orf_id
     LEFT JOIN petadex_clustering c ON c.orf_id = o.orf_id
     WHERE o.orf_id = $1`,
    [orfId],
  )
  return rows[0] || null
}

// GET /api/orf/:orfId/provenance — provenance block alone (orf_origin dispatch).
router.get('/:orfId/provenance', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId))
  if (error) return res.status(400).json({ error: error.message })

  try {
    const core = await fetchOrfCore(orfId)
    if (!core) return res.status(404).json({ error: `ORF ${orfId} not found` })
    const { provenance } = await fetchProvenance(orfId, core.orf_origin)
    res.json({
      orf_id: orfId,
      orf_origin: core.orf_origin,
      orf_origin_label: ORIGIN_LABELS[core.orf_origin] ?? null,
      provenance,
    })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'A provenance backing table is unavailable' })
    }
    next(err)
  }
})

// GET /api/orf/:orfId/domains — factual catalytic-domain evidence (corpus-keyed).
// petadex_catalytic_domains (307M, by corpus orf_id) joined to pazy_hmms by the
// HMM component stem (the two tables carry different build suffixes — see
// "02 - Backend Routing Plan" finding #5). Framed as deterministic HMM evidence,
// NOT a function claim ("01 - Per-Sequence Annotation Plan").
router.get('/:orfId/domains', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId))
  if (error) return res.status(400).json({ error: error.message })

  try {
    const { rows } = await pool.query(
      `SELECT d.pazy_hmm_id, d.domain_start, d.domain_end,
              d.catalytic_residues, d.date_performed,
              h.domain AS domain_name, h.catalytic_match_states
       FROM petadex_catalytic_domains d
       LEFT JOIN pazy_hmms h
         ON regexp_replace(h.pazy_hmm_id, '_[0-9]+(\\.hmm)?$', '')
          = regexp_replace(d.pazy_hmm_id, '_[0-9]+(\\.hmm)?$', '')
       WHERE d.orf_id = $1
       ORDER BY d.domain_start`,
      [orfId],
    )
    res.json(
      rows.map(r => ({
        pazy_hmm_id: r.pazy_hmm_id,
        domain: r.domain_name ?? null,
        domain_start: r.domain_start,
        domain_end: r.domain_end,
        catalytic_residues: pgArray(r.catalytic_residues),
        catalytic_match_states: pgArray(r.catalytic_match_states),
        date_performed: r.date_performed ?? null,
        evidence_type: 'HMMsearch top hit vs PAZy HMM',
      })),
    )
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Catalytic-domain backing table is unavailable' })
    }
    next(err)
  }
})

// GET /api/orf/:orfId/annotations — Angela sequence predictions (SignalP live;
// DeepLoc + biochem soft-fail until tables exist after the next DB update).
router.get('/:orfId/annotations', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId))
  if (error) return res.status(400).json({ error: error.message })

  try {
    const core = await fetchOrfCore(orfId)
    if (!core) return res.status(404).json({ error: `ORF ${orfId} not found` })

    const [signalp, localization, biochemical] = await Promise.all([
      fetchSignalpPrediction(pool, orfId),
      fetchDeeplocPrediction(pool, orfId),
      fetchBiochemProperties(pool, orfId),
    ])

    res.json({
      orf_id: orfId,
      signalp,
      localization,
      biochemical,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/orf/:orfId — first-paint corpus sequence payload.
router.get('/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId))
  if (error) return res.status(400).json({ error: error.message })

  try {
    const core = await fetchOrfCore(orfId)
    if (!core) return res.status(404).json({ error: `ORF ${orfId} not found` })

    // Sequence bytes: single S3 Range read. Degrade gracefully on failure.
    let sequence = null
    let sequenceError = null
    if (core.byte_offset != null && core.byte_length != null) {
      try {
        const parsed = await fetchOrfSequence({
          byteOffset: core.byte_offset,
          byteLength: core.byte_length,
        })
        sequence = parsed.sequence || null
      } catch (e) {
        sequenceError = e.message || 'Sequence retrieval failed'
      }
    } else {
      sequenceError = 'No byte-offset index for this ORF'
    }

    const computed = sequence ? computeSeqStats(sequence) : null

    // Provenance folded in (first-paint fact, single round-trip — "03").
    const { provenance, genbank_accession_id, orf_type } = await fetchProvenance(
      orfId,
      core.orf_origin,
    )

    res.json({
      orf_id: orfId,
      orf_origin: core.orf_origin,
      orf_origin_label: ORIGIN_LABELS[core.orf_origin] ?? null,
      date_retrieval: core.date_retrieval ?? null,
      sequence,
      length: computed ? computed.length : null,
      orf_type,
      genbank_accession_id,
      ancestors: {
        c90_id: core.c90_id ?? null,
        c60_id: core.c60_id ?? null,
        c30_id: core.c30_id ?? null,
      },
      computed,
      provenance,
      ...(sequenceError ? { sequence_error: sequenceError } : {}),
    })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'An ORF backing table is unavailable' })
    }
    next(err)
  }
})

export default router
