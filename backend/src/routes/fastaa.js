// backend/src/routes/fastaa.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const schema = Joi.string().max(64).required();

// GET all sequences
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        f.accession,
        f.aa_sequence as sequence,
        f.source,
        f.synonyms,
        f.date_entered,
        f.genotype,
        f.genotype_description,
        f.synthetic,
        f.parent_accessions,
        f.parent_genes,
        f.in_gene_metadata,
        EXISTS(
          SELECT 1
          FROM with_sra_and_biosample_loc_metadata m
          WHERE m.accession = f.accession
        ) as in_sra_metadata
      FROM fastaa f
      ORDER BY f.accession ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET by accession
router.get('/:accession', async (req, res, next) => {
  console.log('API request received for accession:', req.params.accession);
  const { error, value } = schema.validate(req.params.accession);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        f.accession,
        f.aa_sequence as sequence,
        f.source,
        f.synonyms,
        f.date_entered,
        f.genotype,
        f.genotype_description,
        f.synthetic,
        f.parent_accessions,
        f.parent_genes,
        f.in_gene_metadata,
        EXISTS(
          SELECT 1
          FROM with_sra_and_biosample_loc_metadata m
          WHERE m.accession = f.accession
        ) as in_sra_metadata
      FROM fastaa f
      WHERE f.accession = $1`,
      [value]
    );
    console.log('Query result:', rows.length ? 'Found' : 'Not found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

export default router;