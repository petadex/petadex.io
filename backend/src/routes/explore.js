// backend/src/routes/explore.js
//
// Browsing the PETadex v260701 dataset without a query (/explore page).
//   GET /api/explore/summary                       -> levels (protein, 90, 60, 30) + folds, each split by source
//   GET /api/explore/plasticome                    -> the Plasticome entries with names, substrates, EC and clusters
//   GET /api/explore/superfamilies?fold=&has_plasticome=&env=&sort=&order=&offset=&limit=
//                                                  -> { total, offset, limit, rows }
//   GET /api/explore/envs?fold=                    -> dominant environment profiles of superfamilies, with counts
//   GET /api/explore/random?kind=protein|90|60|30  -> { kind, id, path }
// Sorts are facts the viewer picks (size, families, Plasticome members, nr members, Logan share, BioSamples).
import { Router } from 'express'
import Joi from 'joi'
import {
  fetchExploreFile, fetchSuperfamilies, fetchSuperfamilyEnvs, randomCluster, randomProtein, SUPERFAMILY_SORTS,
} from '../lib/explore.js'

const router = Router()
const unavailable = err => ['42P01', '3F000', 'STORE_MISSING'].includes(err?.code)
const FOLD = Joi.string().pattern(/^[a-z0-9-]{1,40}$/)

function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res)
    } catch (err) {
      if (unavailable(err)) return res.status(503).json({ error: 'v260701 explore data is not available' })
      next(err)
    }
  }
}

const cacheFor = (res, s) => res.set('Cache-Control', `public, max-age=${s}`)

router.get('/summary', handle(async (req, res) => {
  cacheFor(res, 86400)
  res.json(await fetchExploreFile('summary'))
}))

router.get('/plasticome', handle(async (req, res) => {
  cacheFor(res, 86400)
  res.json({ release: 'v260701', entries: await fetchExploreFile('plasticome') })
}))

const listSchema = Joi.object({
  fold: FOLD.allow('', null).default(null),
  has_plasticome: Joi.boolean().default(false),
  env: Joi.string().pattern(/^[a-z_]{1,40}$/).allow('', null).default(null),
  sort: Joi.string().valid(...Object.keys(SUPERFAMILY_SORTS)).default('size'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  offset: Joi.number().integer().min(0).max(1000000).default(0),
  limit: Joi.number().integer().min(1).max(200).default(50),
})

router.get('/superfamilies', handle(async (req, res) => {
  const { error, value } = listSchema.validate(req.query)
  if (error) return res.status(400).json({ error: error.message })
  const out = await fetchSuperfamilies({
    fold: value.fold || null, hasPlasticome: value.has_plasticome, env: value.env || null,
    sort: value.sort, order: value.order, offset: value.offset, limit: value.limit,
  })
  cacheFor(res, 3600)
  res.json({ release: 'v260701', offset: value.offset, limit: value.limit, ...out })
}))

router.get('/envs', handle(async (req, res) => {
  const { error, value } = Joi.object({ fold: FOLD.allow('', null).default(null) }).validate(req.query)
  if (error) return res.status(400).json({ error: error.message })
  cacheFor(res, 3600)
  res.json({ release: 'v260701', envs: await fetchSuperfamilyEnvs(value.fold || null) })
}))

const KINDS = ['protein', '90', '60', '30']

router.get('/random', handle(async (req, res) => {
  const { error, value } = Joi.object({ kind: Joi.string().valid(...KINDS).default('30') }).validate(req.query)
  if (error) return res.status(400).json({ error: error.message })
  const summary = await fetchExploreFile('summary')
  const lv = summary.levels.find(l => String(l.level) === value.kind)
  const id = value.kind === 'protein' ? await randomProtein(lv.n) : await randomCluster(Number(value.kind), lv.n)
  if (!id) return res.status(503).json({ error: 'no random pick available' })
  res.set('Cache-Control', 'no-store')
  res.json({ kind: value.kind, id, path: value.kind === 'protein' ? `/sequence/${id}/` : `/cluster/${value.kind}/${id}/` })
}))

export default router
