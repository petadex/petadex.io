// backend/src/routes/v260701Links.js
//
// PETadex v260701: which Logan sequences (LGs) were assembled from a BioSample's runs, or from one run.
//   GET /api/biosamples/:id/lgs?offset=&limit=   -> { biosample, bioproject, n_lg, offset, limit, sequences: [{id, ka_max, n_runs}] }
//   GET /api/runs/:run/lgs?offset=&limit=        -> { run, n_lg, offset, limit, sequences: [{id, ka}] }
// Ordered by contig k-mer abundance (highest first), then LG number. 404 when the accession carries no PETadex
// sequence. The index lives in RDS (v260701.biosample_lgs / run_lgs); the lists in the S3 site store.
import { Router } from 'express'
import Joi from 'joi'
import { fetchBiosampleLgs, fetchRunLgs } from '../lib/v260701.js'

const router = Router()

export const BIOSAMPLE_RE = /^(SAMN|SAMEA|SAMD|ERS|SRS)\d{1,12}$/
export const RUN_RE = /^(SRR|ERR|DRR)\d{1,12}$/
const pageSchema = Joi.object({
  offset: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  limit: Joi.number().integer().min(1).max(500).default(100),
})
const unavailable = err => ['42P01', '3F000', 'STORE_MISSING'].includes(err?.code)

function handler(re, what, fetcher) {
  return async (req, res, next) => {
    const id = String(req.params.id || '').trim().toUpperCase()
    if (!re.test(id)) return res.status(400).json({ error: `not a ${what} accession` })
    const { error, value } = pageSchema.validate(req.query)
    if (error) return res.status(400).json({ error: error.message })
    try {
      const out = await fetcher(id, value.offset, value.limit)
      if (!out) return res.status(404).json({ error: `${id} carries no PETadex v260701 sequence` })
      res.set('Cache-Control', 'public, max-age=3600')
      res.json({ release: 'v260701', ...out })
    } catch (err) {
      if (unavailable(err)) return res.status(503).json({ error: 'v260701 link store is not available' })
      next(err)
    }
  }
}

router.get('/biosamples/:id/lgs', handler(BIOSAMPLE_RE, 'BioSample', fetchBiosampleLgs))
router.get('/runs/:id/lgs', handler(RUN_RE, 'run', fetchRunLgs))

export default router
