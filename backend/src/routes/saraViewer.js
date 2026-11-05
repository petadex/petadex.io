// backend/src/routes/saraViewer.js — prototype / test tables only
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import { buildSaraViewerPayload } from '../lib/saraViewerData.js';

const router = Router();

const orfIdSchema = Joi.number().integer().min(1).required();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT orf_id FROM (
        SELECT orf_id FROM sara_domains
        UNION
        SELECT orf_id FROM sara_important_motfis
        UNION
        SELECT orf_id FROM sara_signal_sequences
      ) t
      ORDER BY orf_id ASC`,
    );
    const orfIds = rows.map((r) => Number(r.orf_id)).filter((n) => Number.isFinite(n));
    res.json({ orfIds: orfIds.length ? orfIds : [1] });
  } catch (err) {
    next(err);
  }
});

router.get('/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId));
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const payload = await buildSaraViewerPayload(orfId);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
