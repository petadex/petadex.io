// backend/src/routes/pdb.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const schema = Joi.string().max(64).required();

// GET PDB info by accession
router.get('/accession/:accession', async (req, res, next) => {
  const { error, value } = schema.validate(req.params.accession);
  if (error) {
    console.log('Validation error for accession:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    console.log('Querying PDB for accession:', value);
    const { rows } = await pool.query(
      `SELECT pdb_id, accession, technique, relaxed, date_created, date_entered, alignment
       FROM pdb_accessions
       WHERE accession = $1
       ORDER BY date_created DESC
       LIMIT 1`,
      [value]
    );

    console.log('Query result rows:', rows.length);

    if (!rows.length) {
      console.log('No PDB structure found for accession:', value);
      return res.status(404).json({ error: 'No PDB structure found for this accession' });
    }

    // Add S3 URL for the PDB file (publicly accessible, no auth required)
    const pdbInfo = rows[0];
    pdbInfo.pdb_url = `https://petadex.s3.amazonaws.com/pdb_structs/${pdbInfo.pdb_id}.pdb`;
    console.log('PDB found:', pdbInfo.pdb_id, 'URL:', pdbInfo.pdb_url);

    res.json(pdbInfo);
  } catch (err) {
    console.error('Error querying PDB:', err);
    next(err);
  }
});

// GET PDB info by pdb_id
router.get('/:pdb_id', async (req, res, next) => {
  const { error, value } = schema.validate(req.params.pdb_id);
  if (error) {
    console.log('Validation error for pdb_id:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    console.log('Querying PDB by pdb_id:', value);
    const { rows } = await pool.query(
      `SELECT pdb_id, accession, technique, relaxed, date_created, date_entered, alignment
       FROM pdb_accessions
       WHERE pdb_id = $1`,
      [value]
    );

    console.log('Query result rows:', rows.length);

    if (!rows.length) {
      console.log('No PDB structure found for pdb_id:', value);
      return res.status(404).json({ error: 'PDB structure not found' });
    }

    // Add S3 URL for the PDB file (publicly accessible, no auth required)
    const pdbInfo = rows[0];
    pdbInfo.pdb_url = `https://petadex.s3.amazonaws.com/pdb_structs/${pdbInfo.pdb_id}.pdb`;
    console.log('PDB found:', pdbInfo.pdb_id, 'URL:', pdbInfo.pdb_url);

    res.json(pdbInfo);
  } catch (err) {
    console.error('Error querying PDB by pdb_id:', err);
    next(err);
  }
});

export default router;
