// backend/src/routes/geneMetadata.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const schema = Joi.string().max(64).required();

// GET by accession (useful for linking from fastaa table) - returns ARRAY
router.get('/by-accession/:accession', async (req, res, next) => {
  console.log('API request received for accession:', req.params.accession);
  const { error, value } = schema.validate(req.params.accession);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
        gene, 
        nickname, 
        accession, 
        orf_nt_sequence, 
        left_homology_arm, 
        right_homology_arm, 
        batch, 
        date_entered, 
        genetic_code 
      FROM gene_metadata 
      WHERE accession = $1
      ORDER BY gene ASC`,
      [value]
    );
    console.log('Query result:', rows.length, 'record(s) found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    // Return array of all matching genes
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

export default router;