/**
 * Routes for enzyme kinetics data.
 * Backs the /kinetics page (Kinetics Registry) on the frontend.
 */

import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * GET /api/kinetics/published
 * Returns published (experimental) enzyme kinetic parameters from the
 * public.plastic_kinetics_published table.
 *
 * The frontend (frontend/src/pages/kinetics.js) accepts either a bare array
 * or a { data: [...] } envelope; we return a bare array. It renders the keys:
 * enzyme, species, substrate, temp, ph, kcat, km, ratio, doi — so the source
 * columns (mixed case / special chars, hence the double-quoting) are aliased
 * to those names here. The frontend's search + CSV export operate over exactly
 * the returned keys, so we expose only the contract columns.
 */
router.get('/published', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         "Enzyme"          AS enzyme,
         "Species"         AS species,
         "Substrate"       AS substrate,
         "Temperature"     AS temp,
         "pH"              AS ph,
         "Kcat_(/s)"       AS kcat,
         "Km_(M)"          AS km,
         "Kcat/Km_(/s/M)"  AS ratio,
         "DOI"             AS doi
       FROM public.plastic_kinetics_published
       ORDER BY "Experiment_#"`
    );
    res.json(rows);
  } catch (err) {
    next(err); // Handled by global error middleware
  }
});

/**
 * GET /api/kinetics/published/raw
 * Returns the complete public.plastic_kinetics_published table — every column,
 * every row, with the original SQL column names preserved. Backs the
 * "Download raw data" button on the /kinetics page, which builds a CSV from
 * this payload. The on-page table shows only a shortened subset of columns.
 */
router.get('/published/raw', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM public.plastic_kinetics_published ORDER BY "Experiment_#"'
    );
    res.json(rows);
  } catch (err) {
    next(err); // Handled by global error middleware
  }
});

export default router;
