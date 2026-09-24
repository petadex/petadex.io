// backend/src/routes/annotation.js
//
// BioSample annotation layer routes ("02 Annotation Layer - Frontend" §2).
// Mounted at /api, so the paths below are the public contract verbatim:
//
//   GET  /api/sequences/:orfId/provenance          one provenance row
//   POST /api/annotations/batch                    { orf_ids: [...] } → rows, same length + order
//   GET  /api/biosamples/:id                       annotation (or null) + runs
//   GET  /api/biosamples/:id/sequences?after=&limit=   keyset-paged ORFs
//   GET  /api/clusters/:pid90/profiles             cluster profile summary + distribution
//   GET  /api/profiles                             the 22 profiles (precomputed)
//   GET  /api/profiles/:slug                       one profile
//   GET  /api/profiles/:slug/biosamples?after=&limit=&evidence=   keyset-paged BioSamples
//
// Enrichment is a separate call joined at read time — never baked into the
// DIAMOND job JSON — so cached search results stay valid across metadata reloads.
// Every query is an indexed lookup; none needs a cache for speed.
import { Router } from 'express'
import Joi from 'joi'
import {
  fetchProvenanceRows,
  fetchBiosample,
  fetchBiosampleSequences,
  fetchClusterProfiles,
  fetchProfiles,
  fetchProfile,
  fetchProfileBiosamples,
} from '../lib/annotation.js'

const router = Router()

// 500 is benchmarked (~250–450 ms); 1,000 is the contract cap.
export const BATCH_CAP = 1000

const bigintId = Joi.number().integer().min(1).max(Number.MAX_SAFE_INTEGER)
const orfIdSchema = bigintId.required()
const batchSchema = Joi.object({
  orf_ids: Joi.array().items(bigintId.required()).min(1).max(BATCH_CAP).required(),
})
// BioSample accessions: SAMN…/SAMEA…/SAMD… — alnum only keeps junk out of the query.
const biosampleSchema = Joi.string().pattern(/^[A-Za-z0-9]+$/).max(64).required()
const pageSchema = Joi.object({
  after: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  limit: Joi.number().integer().min(1).max(500).default(100),
})
const slugSchema = Joi.string().pattern(/^[a-z_]+$/).max(64).required()
const profilePageSchema = Joi.object({
  after: Joi.string().pattern(/^[A-Za-z0-9]*$/).max(64).allow('').default(''),
  limit: Joi.number().integer().min(1).max(200).default(50),
  evidence: Joi.string().valid('stated', 'inferred', 'form_template', 'none'),
})

/** 42P01 = relation missing (annotation tables not loaded on this snapshot). */
function unavailable(err, res, what) {
  if (err.code === '42P01' || err.code === '42703') {
    res.status(503).json({ error: `${what} backing table is unavailable` })
    return true
  }
  return false
}

// GET /api/sequences/:orfId/provenance — always one row, even when nothing resolves.
router.get('/sequences/:orfId/provenance', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(req.params.orfId)
  if (error) return res.status(400).json({ error: 'orf_id must be a positive integer' })
  try {
    const [row] = await fetchProvenanceRows([orfId])
    res.json(row)
  } catch (err) {
    if (!unavailable(err, res, 'Provenance')) next(err)
  }
})

// POST /api/annotations/batch — response is the same length and order as orf_ids.
router.post('/annotations/batch', async (req, res, next) => {
  const { error, value } = batchSchema.validate(req.body ?? {})
  if (error) return res.status(400).json({ error: error.message, cap: BATCH_CAP })
  try {
    const rows = await fetchProvenanceRows(value.orf_ids)
    res.json({ results: rows })
  } catch (err) {
    if (!unavailable(err, res, 'Provenance')) next(err)
  }
})

// GET /api/biosamples/:id — 404 only when neither the annotation nor any run knows it.
router.get('/biosamples/:id', async (req, res, next) => {
  const { error, value: id } = biosampleSchema.validate(req.params.id)
  if (error) return res.status(400).json({ error: 'Invalid BioSample accession' })
  try {
    const { annotation, runs } = await fetchBiosample(id)
    if (!annotation && !runs.length) {
      return res.status(404).json({ error: `BioSample ${id} not found` })
    }
    res.json({ biosample: id, annotation, runs })
  } catch (err) {
    if (!unavailable(err, res, 'BioSample')) next(err)
  }
})

// GET /api/biosamples/:id/sequences?after=<last orf_id, 0 first>&limit=
router.get('/biosamples/:id/sequences', async (req, res, next) => {
  const { error: idError, value: id } = biosampleSchema.validate(req.params.id)
  if (idError) return res.status(400).json({ error: 'Invalid BioSample accession' })
  const { error, value } = pageSchema.validate(req.query, { allowUnknown: false })
  if (error) return res.status(400).json({ error: error.message })
  try {
    const page = await fetchBiosampleSequences(id, value.after, value.limit)
    res.json({ biosample: id, ...page })
  } catch (err) {
    if (!unavailable(err, res, 'BioSample')) next(err)
  }
})

// GET /api/clusters/:pid90/profiles — pid90 = block_90pid.cluster_id.
router.get('/clusters/:pid90/profiles', async (req, res, next) => {
  const { error, value: pid90 } = orfIdSchema.validate(req.params.pid90)
  if (error) return res.status(400).json({ error: 'pid90 must be a positive integer' })
  try {
    const { summary, distribution } = await fetchClusterProfiles(pid90)
    if (!summary) return res.status(404).json({ error: `Cluster ${pid90} not found` })
    res.json({ ...summary, distribution })
  } catch (err) {
    if (!unavailable(err, res, 'Cluster annotation')) next(err)
  }
})

// GET /api/profiles — reads the precomputed profile_summary (live aggregate took 28 s).
router.get('/profiles', async (req, res, next) => {
  try {
    res.json(await fetchProfiles())
  } catch (err) {
    if (!unavailable(err, res, 'Profile summary')) next(err)
  }
})

router.get('/profiles/:slug', async (req, res, next) => {
  const { error, value: slug } = slugSchema.validate(req.params.slug)
  if (error) return res.status(400).json({ error: 'Invalid profile slug' })
  try {
    const row = await fetchProfile(slug)
    if (!row) return res.status(404).json({ error: `Profile ${slug} not found` })
    res.json(row)
  } catch (err) {
    if (!unavailable(err, res, 'Profile summary')) next(err)
  }
})

// GET /api/profiles/:slug/biosamples — in-universe BioSamples with this profile.
router.get('/profiles/:slug/biosamples', async (req, res, next) => {
  const { error: slugError, value: slug } = slugSchema.validate(req.params.slug)
  if (slugError) return res.status(400).json({ error: 'Invalid profile slug' })
  const { error, value } = profilePageSchema.validate(req.query)
  if (error) return res.status(400).json({ error: error.message })
  try {
    const page = await fetchProfileBiosamples(slug, value.after, value.limit, value.evidence ?? null)
    res.json({ profile: slug, ...page })
  } catch (err) {
    if (!unavailable(err, res, 'BioSample')) next(err)
  }
})

export default router
