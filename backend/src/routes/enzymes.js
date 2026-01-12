/**
 * Routes for BLAST-NR enzyme sequences
 * Provides access to enzyme_fastaa, enzyme_taxonomy, and variant_dictionary tables
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();

// Validation schemas
const enzymeIdSchema = Joi.number().integer().positive().required();
const accessionSchema = Joi.string().max(64).required();
const familyIdSchema = Joi.number().integer().positive().required();
const componentIdSchema = Joi.number().integer().positive().required();

/**
 * GET /api/enzymes
 * List all enzymes with optional filtering
 * Query params:
 *   - limit: number of results (default 50, max 1000)
 *   - offset: pagination offset (default 0)
 *   - family: filter by family_id
 *   - component: filter by component_id
 *   - has_component: true/false - filter sequences with/without component assignment
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
    const offset = parseInt(req.query.offset) || 0;
    const familyFilter = req.query.family ? parseInt(req.query.family) : null;
    const componentFilter = req.query.component ? parseInt(req.query.component) : null;
    const hasComponent = req.query.has_component;

    let query = `
      SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (familyFilter !== null) {
      paramCount++;
      query += ` AND t.family = $${paramCount}`;
      params.push(familyFilter);
    }

    if (componentFilter !== null) {
      paramCount++;
      query += ` AND t.component = $${paramCount}`;
      params.push(componentFilter);
    }

    if (hasComponent === 'true') {
      query += ` AND t.component IS NOT NULL`;
    } else if (hasComponent === 'false') {
      query += ` AND t.component IS NULL`;
    }

    query += ` ORDER BY e.enzyme_id LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (familyFilter !== null) {
      countParamCount++;
      countQuery += ` AND t.family = $${countParamCount}`;
      countParams.push(familyFilter);
    }

    if (componentFilter !== null) {
      countParamCount++;
      countQuery += ` AND t.component = $${countParamCount}`;
      countParams.push(componentFilter);
    }

    if (hasComponent === 'true') {
      countQuery += ` AND t.component IS NOT NULL`;
    } else if (hasComponent === 'false') {
      countQuery += ` AND t.component IS NULL`;
    }

    const { rows: countRows } = await pool.query(countQuery, countParams);
    const total = parseInt(countRows[0].total);

    res.json({
      data: rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/:enzyme_id
 * Get a specific enzyme by enzyme_id
 */
router.get('/:enzyme_id', async (req, res, next) => {
  const { error, value } = enzymeIdSchema.validate(req.params.enzyme_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE e.enzyme_id = $1`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Enzyme not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/accession/:accession
 * Get enzyme by GenBank accession ID
 */
router.get('/accession/:accession', async (req, res, next) => {
  const { error, value } = accessionSchema.validate(req.params.accession);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE e.genbank_accession_id = $1`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Enzyme not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/:enzyme_id/variants
 * Get all variants for a specific enzyme centroid
 */
router.get('/:enzyme_id/variants', async (req, res, next) => {
  const { error, value } = enzymeIdSchema.validate(req.params.enzyme_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        v.variant_id,
        v.enzyme_id,
        v.genbank_accession_id,
        v.enzyme_pid
      FROM variant_dictionary v
      WHERE v.enzyme_id = $1
      ORDER BY v.enzyme_pid DESC NULLS FIRST`,
      [value]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/family/:family_id
 * Get all enzymes in a specific family
 */
router.get('/family/:family_id', async (req, res, next) => {
  const { error, value } = familyIdSchema.validate(req.params.family_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE t.family = $1
      ORDER BY t.family_pid DESC NULLS FIRST`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No enzymes found for this family' });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/component/:component_id
 * Get all enzymes in a specific component
 */
router.get('/component/:component_id', async (req, res, next) => {
  const { error, value } = componentIdSchema.validate(req.params.component_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE t.component = $1
      ORDER BY t.family, t.family_pid DESC NULLS FIRST`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No enzymes found for this component' });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/stats
 * Get statistics about the enzyme database
 */
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(DISTINCT e.enzyme_id) as total_enzymes,
        COUNT(DISTINCT t.family) as total_families,
        COUNT(DISTINCT t.component) as total_components,
        COUNT(DISTINCT v.variant_id) as total_variants
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      LEFT JOIN variant_dictionary v ON e.enzyme_id = v.enzyme_id
    `);

    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
