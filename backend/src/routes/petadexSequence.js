// backend/src/routes/petadexSequence.js
//
// v260701 sequence page API.
//   GET /api/sequence/:id        one payload for the whole page: the stored record (sequence, core, clusters,
//                                provenance) + computed stats + the three cluster rows + the representative
//                                BioSample's stated annotation (Logan) + curated PDB structures (PL / NR).
//   GET /api/lookup?q=           identifier lookup: a petadex_id or an external accession -> petadex_id(s).
// Only ids of the form PL… / NR… / LG… are handled here; anything else falls through (next()) so the existing
// /api/sequence/:id/samples relay keeps working.
import { Router } from 'express'
import { computeSeqStats } from '../lib/seqStats.js'
import {
  parseId, fetchSequenceRecord, fetchClustersOf, fetchBiosampleAnnotation, fetchPdbFor, lookupAccession, SOURCE_LABELS,
} from '../lib/v260701.js'

export const sequenceRouter = Router()
export const lookupRouter = Router()

const unavailable = err => err?.code === '42P01' || err?.code === '3F000'

sequenceRouter.get('/:id', async (req, res, next) => {
  const id = String(req.params.id || '').trim()
  if (!parseId(id)) return next()
  try {
    const rec = await fetchSequenceRecord(id)
    if (!rec) return res.status(404).json({ error: `Sequence ${id} not found in PETadex v260701` })

    const accessions = rec.accessions || (rec.accession ? [rec.accession] : [])
    // Side lookups are optional: the stored record alone renders the page, so a failing table never blanks it.
    const soft = (p, fallback, what) => p.catch(err => {
      console.error(`sequence ${id}: ${what} unavailable:`, err.code || err.message)
      return fallback
    })
    const [clusters, biosample, pdb] = await Promise.all([
      soft(fetchClustersOf(rec.clusters || {}), {}, 'cluster rows'),
      rec.src === 'LG' ? soft(fetchBiosampleAnnotation(rec.logan?.biosample), null, 'biosample annotation') : null,
      rec.src !== 'LG' ? soft(fetchPdbFor(accessions), [], 'pdb') : [],
    ])
    res.set('Cache-Control', 'public, max-age=3600')
    res.json({
      release: 'v260701',
      ...rec,
      source_label: SOURCE_LABELS[rec.src] ?? null,
      computed: rec.seq ? computeSeqStats(rec.seq) : null,
      cluster_rows: clusters,
      biosample_annotation: biosample,
      pdb,
    })
  } catch (err) {
    if (unavailable(err)) return res.status(503).json({ error: 'v260701 tables are not available on this database' })
    next(err)
  }
})

lookupRouter.get('/', async (req, res, next) => {
  const q = String(req.query.q || '').trim()
  if (!q || q.length > 64) return res.status(400).json({ error: 'q must be 1-64 characters' })
  try {
    const up = q.toUpperCase()
    if (parseId(up)) {
      const rec = await fetchSequenceRecord(up)
      return res.json({ q, kind: rec ? 'sequence' : 'none', matches: rec ? [{ petadex_id: up, match: 'petadex_id' }] : [] })
    }
    const rows = await lookupAccession(q)
    res.json({
      q,
      kind: rows.length === 1 ? 'sequence' : rows.length ? 'list' : 'none',
      matches: rows.map(r => ({ petadex_id: r.petadex_id, match: 'accession', accession: r.accession })),
    })
  } catch (err) {
    if (unavailable(err)) return res.status(503).json({ error: 'v260701 tables are not available on this database' })
    next(err)
  }
})
