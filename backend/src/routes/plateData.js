// backend/src/routes/plateData.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const schema = Joi.string().max(64).required();

// GET average readout for a specific gene, grouped by plate with metadata
router.get('/gene/:gene/average', async (req, res, next) => {
  console.log('API request received for gene plate data:', req.params.gene);
  const { error, value } = schema.validate(req.params.gene);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        pd.plate,
        AVG(pd.readout_value) as average_readout,
        COUNT(*) as sample_count,
        pd.measurement_type,
        pm.timepoint_hours,
        pm.temp_celsius,
        pm.ph,
        pm.media,
        pm.organism,
        pm.exp_id,
        pm.exp_description,
        pm.date_created,
        pm.date_read
      FROM plate_data pd
      LEFT JOIN plate_metadata pm ON pd.plate = pm.plate
      WHERE pd.gene = $1 AND pd.readout_value IS NOT NULL
      GROUP BY pd.plate, pd.measurement_type, pm.timepoint_hours, pm.temp_celsius,
               pm.ph, pm.media, pm.organism, pm.exp_id, pm.exp_description,
               pm.date_created, pm.date_read
      ORDER BY pm.timepoint_hours, pd.plate`,
      [value]
    );

    console.log('Query result:', rows.length, 'plate(s) found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    // Return all plate averages with their metadata
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET all plate data for a gene
router.get('/gene/:gene', async (req, res, next) => {
  console.log('API request received for gene plate data:', req.params.gene);
  const { error, value } = schema.validate(req.params.gene);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        gene,
        plate,
        plasmid,
        column,
        row,
        normalization_method,
        readout_value,
        colony_size,
        date_entered,
        measurement_type
      FROM plate_data
      WHERE gene = $1
      ORDER BY plate, row, column`,
      [value]
    );

    console.log('Query result:', rows.length, 'records found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET plate activity using materialized view (includes all metadata)
router.get('/activity/gene/:gene', async (req, res, next) => {
  console.log('API request received for gene activity data:', req.params.gene);
  const { error, value } = schema.validate(req.params.gene);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        gene,
        plate,
        readout_value,
        measurement_type,
        normalization_method,
        colony_size,
        row,
        column,
        plasmid,
        exp_id,
        exp_description,
        media,
        timepoint_hours,
        temp_celsius,
        ph,
        organism,
        control_genes,
        operator,
        date_created,
        date_read
      FROM plate_activity_view
      WHERE gene = $1
      ORDER BY plate, row, column`,
      [value]
    );

    console.log('Query result:', rows.length, 'records found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET plate data by experiment ID
router.get('/experiment/:exp_id', async (req, res, next) => {
  console.log('API request received for experiment:', req.params.exp_id);
  const { error, value } = schema.validate(req.params.exp_id);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        gene,
        plate,
        readout_value,
        measurement_type,
        normalization_method,
        colony_size,
        row,
        column,
        plasmid,
        exp_id,
        exp_description,
        media,
        timepoint_hours,
        temp_celsius,
        ph,
        organism,
        control_genes,
        operator,
        date_created,
        date_read
      FROM plate_activity_view
      WHERE exp_id = $1
      ORDER BY gene, plate, row, column`,
      [value]
    );

    console.log('Query result:', rows.length, 'records found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

export default router;