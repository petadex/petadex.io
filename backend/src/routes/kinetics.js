/**
 * Routes for enzyme kinetics data.
 * Backs the /kinetics page (Kinetics Registry) on the frontend.
 */

import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

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
