// backend/src/routes/aaSeqFeatures.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const accessionSchema = Joi.string().max(64).required();

// GET features by accession
router.get('/:accession', async (req, res, next) => {
  const { error, value } = accessionSchema.validate(req.params.accession);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM aa_seq_features WHERE accession = $1',
      [value]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;