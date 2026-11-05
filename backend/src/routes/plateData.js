// backend/src/routes/plateData.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const schema = Joi.string().max(64).required();

// GET substrate comparison data: timeseries + activity metrics in a single response.
// Replaces the former /substrate-comparison and /substrate-activity endpoints.
// ?media=BHET12.5,BHET25[,BHET50]
router.get('/comparison', async (req, res, next) => {
  const mediaString = req.query.media || 'BHET12.5,BHET25';
  const mediaSchema = Joi.string().max(128);
  const { error } = mediaSchema.validate(mediaString);
  if (error) return res.status(400).json({ error: error.message });

  const mediaTypes = mediaString.split(',').map(m => m.trim());

  try {
    const { rows } = await pool.query(
      `SELECT
        aav.gene,
        gm.nickname,
        aav.accession,
        aav.source,
        aav.media,
        aav.timepoint_hours,
        AVG(aav.readout_value)      AS average_readout,
        STDDEV_SAMP(aav.readout_value) AS stddev_readout,
        COUNT(*)                    AS sample_count
      FROM accession_activity_view aav
      LEFT JOIN gene_metadata gm ON aav.gene = gm.gene
      WHERE aav.media = ANY($1::text[])
        AND aav.readout_value IS NOT NULL
      GROUP BY
        aav.gene, gm.nickname, aav.accession, aav.source,
        aav.media, aav.timepoint_hours
      ORDER BY aav.gene, aav.media, aav.timepoint_hours`,
      [mediaTypes]
    );

    if (!rows.length) return res.status(404).json({ error: 'No substrate data found' });

    // Compute activity (peak − subsequent min) per gene/media from the timeseries rows
    const geneMediaGroups = {};
    for (const row of rows) {
      const key = `${row.gene}|${row.media}`;
      if (!geneMediaGroups[key]) {
        geneMediaGroups[key] = {
          gene: row.gene, nickname: row.nickname,
          accession: row.accession, source: row.source,
          media: row.media, timepoints: [],
        };
      }
      geneMediaGroups[key].timepoints.push({
        timepoint_hours: parseFloat(row.timepoint_hours),
        average_readout: parseFloat(row.average_readout),
        sample_count: parseInt(row.sample_count),
      });
    }

    const activity = [];
    for (const group of Object.values(geneMediaGroups)) {
      const tps = group.timepoints.sort((a, b) => a.timepoint_hours - b.timepoint_hours);
      let peakIdx = 0, peakValue = tps[0].average_readout;
      for (let i = 1; i < tps.length; i++) {
        if (tps[i].average_readout > peakValue) { peakValue = tps[i].average_readout; peakIdx = i; }
      }

      if (peakIdx === tps.length - 1) {
        activity.push({
          gene: group.gene, nickname: group.nickname,
          accession: group.accession, source: group.source,
          media: group.media, activity: null,
          peak_value: peakValue, peak_timepoint: tps[peakIdx].timepoint_hours,
          min_value: null, min_timepoint: null,
          flag: 'peak_at_end', timepoint_count: tps.length,
        });
        continue;
      }

      let minIdx = peakIdx + 1, minValue = tps[peakIdx + 1].average_readout;
      for (let i = peakIdx + 2; i < tps.length; i++) {
        if (tps[i].average_readout < minValue) { minValue = tps[i].average_readout; minIdx = i; }
      }

      const delta = peakValue - minValue;
      let flag = null;
      if (peakIdx === 0) flag = 'peak_at_start';
      else if (minIdx - peakIdx === 1) flag = 'single_degradation_point';
      else if (delta < 0) flag = 'negative_activity';

      activity.push({
        gene: group.gene, nickname: group.nickname,
        accession: group.accession, source: group.source,
        media: group.media, activity: delta,
        peak_value: peakValue, peak_timepoint: tps[peakIdx].timepoint_hours,
        min_value: minValue, min_timepoint: tps[minIdx].timepoint_hours,
        flag, timepoint_count: tps.length,
      });
    }

    activity.sort((a, b) => a.gene !== b.gene ? a.gene.localeCompare(b.gene) : a.media.localeCompare(b.media));

    console.log('Substrate comparison:', rows.length, 'timeseries rows,', activity.length, 'activity records');
    res.json({ timeseries: rows, activity });
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

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
        STDDEV_SAMP(pd.readout_value) as stddev_readout,
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

export default router;