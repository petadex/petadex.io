// backend/src/routes/geneDetails.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const schema = Joi.string().max(64).required();

// GET all locations with coordinates (for map display)
router.get('/locations', async (req, res, next) => {
  try {
    const [locationsResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT
          w.accession,
          COALESCE(
            NULLIF(NULLIF(w.geo_loc_name_country_calc, ''), 'uncalculated'),
            CASE WHEN w.geo_loc_name_sam ILIKE 'Antarctica%' THEN 'Antarctica' END
          ) AS country,
          COALESCE(
            NULLIF(NULLIF(w.geo_loc_name_country_continent_calc, ''), 'uncalculated'),
            CASE WHEN w.geo_loc_name_sam ILIKE 'Antarctica%' THEN 'Antarctica' END
          ) AS continent,
          w.biome,
          w.organism,
          w.elevation,
          ST_Y(w.lat_lon) AS latitude,
          ST_X(w.lat_lon) AS longitude,
          w.geo_loc_name_sam AS location_name
        FROM with_sra_and_biosample_loc_metadata w
        WHERE w.lat_lon IS NOT NULL`
      ),
      pool.query(
        `SELECT
          COUNT(*) AS total_samples,
          COUNT(DISTINCT COALESCE(
            NULLIF(NULLIF(geo_loc_name_country_calc, ''), 'uncalculated'),
            CASE WHEN geo_loc_name_sam ILIKE 'Antarctica%' THEN 'Antarctica' END
          )) AS total_countries,
          COUNT(DISTINCT COALESCE(
            NULLIF(NULLIF(geo_loc_name_country_continent_calc, ''), 'uncalculated'),
            CASE WHEN geo_loc_name_sam ILIKE 'Antarctica%' THEN 'Antarctica' END
          )) AS total_continents,
          COUNT(DISTINCT biome) AS total_biomes
        FROM with_sra_and_biosample_loc_metadata`
      ),
    ]);
    res.json({
      locations: locationsResult.rows,
      stats: statsResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET header data
router.get('/:accession/header', async (req, res, next) => {
  console.log('API request received for header:', req.params.accession);
  const { error, value } = schema.validate(req.params.accession);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
        w.accession,
        w.geo_loc_name_country_calc as origin_country
      FROM with_sra_and_biosample_loc_metadata w
      WHERE w.accession = $1
      LIMIT 1`,
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

// GET origin and discovery data
router.get('/:accession/origin', async (req, res, next) => {
  console.log('API request received for origin:', req.params.accession);
  const { error, value } = schema.validate(req.params.accession);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        w.accession,
        w.geo_loc_name_country_calc as country,
        w.geo_loc_name_country_continent_calc as continent,
        w.biome,
        w.organism as source_organism,
        w.elevation,
        CASE
          WHEN w.lat_lon IS NOT NULL THEN ST_Y(w.lat_lon)
          ELSE NULL
        END as latitude,
        CASE
          WHEN w.lat_lon IS NOT NULL THEN ST_X(w.lat_lon)
          ELSE NULL
        END as longitude,
        w.geo_loc_name_sam as location_name
      FROM with_sra_and_biosample_loc_metadata w
      WHERE w.accession = $1
      LIMIT 1`,
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

// GET research context data
router.get('/:accession/research', async (req, res, next) => {
  console.log('API request received for research:', req.params.accession);
  const { error, value } = schema.validate(req.params.accession);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
        w.accession,
        w.bioproject,
        w.biosample,
        w.acc as sra_accession,
        w.sra_study,
        w.release_date,
        w.organism,
        w.biosamplemodel_sam as biosample_model
      FROM with_sra_metadata w
      WHERE w.accession = $1
      LIMIT 1`,
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