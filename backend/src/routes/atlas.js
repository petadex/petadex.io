import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import { CathDomainRepository } from '../repositories/CathDomainRepository.js';

const cathIdSchema = Joi.string().max(32).required();

const router = Router();
const repo = new CathDomainRepository(pool);

/** GET /api/atlas/umap — see CathDomainRepository.getUmapPoints */
router.get('/umap', async (req, res, next) => {
  try {
    const points = await repo.getUmapPoints();
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ points });
  } catch (err) {
    next(err);
  }
});

/** GET /api/atlas/components — see CathDomainRepository.getComponents */
router.get('/components', async (req, res, next) => {
  try {
    const components = await repo.getComponents();
    res.json({ components });
  } catch (err) {
    next(err);
  }
});

/** GET /api/atlas/plate-activity/:cathId — see CathDomainRepository.getPlateActivity */
router.get('/plate-activity/:cathId', async (req, res, next) => {
  const { error, value: cathId } = cathIdSchema.validate(req.params.cathId);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const genes = await repo.getPlateActivity(cathId);
    res.json({ genes });
  } catch (err) {
    next(err);
  }
});

/** GET /api/atlas/domain-stats/:cathId — see CathDomainRepository.getDomainStats */
router.get('/domain-stats/:cathId', async (req, res, next) => {
  const { error, value: cathId } = cathIdSchema.validate(req.params.cathId);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const stats = await repo.getDomainStats(cathId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/** GET /api/atlas/sequence-diversity/:cathId — see CathDomainRepository.getSequenceDiversity */
router.get('/sequence-diversity/:cathId', async (req, res, next) => {
  const { error, value: cathId } = cathIdSchema.validate(req.params.cathId);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const stats = await repo.getSequenceDiversity(cathId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/** GET /api/atlas/known-functions/:cathId — see CathDomainRepository.getKnownFunctions */
router.get('/known-functions/:cathId', async (req, res, next) => {
  const { error, value: cathId } = cathIdSchema.validate(req.params.cathId);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const functions = await repo.getKnownFunctions(cathId);
    res.json({ functions });
  } catch (err) {
    next(err);
  }
});

/** GET /api/atlas/domain-text/:cathId — see CathDomainRepository.getDomainText */
router.get('/domain-text/:cathId', async (req, res, next) => {
  const { error, value: cathId } = cathIdSchema.validate(req.params.cathId);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const text = await repo.getDomainText(cathId);
    res.json(text || { overview: null, functionalDiversity: null, interactingDomains: null });
  } catch (err) {
    next(err);
  }
});

export default router;
