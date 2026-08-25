// backend/src/routes/organisms.js
// Organism atlas endpoints, ported from Replit FastAPI (petadex-api/main.py)
// ESM, matching the rest of the backend ("type": "module" in package.json)
import { Router } from 'express';
import { pool as defaultPool } from '../db.js';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

// Helper: safely parse a JSON column that may be stored as a text string
function parseJson(v) {
  if (!v) return [];
  if (Array.isArray(v) || typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return []; }
}

// Boolean coercion handles both PG booleans and 0/1 integers from CSV import
const bool = v => Boolean(v && v !== '0' && v !== 0);

export function createOrganismsRouter(pool) {
const router = Router();

// ── GET /api/organisms/stats ──────────────────────────────────────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                      AS total_organisms,
        COUNT(*) FILTER (WHERE bioplastic_relevant IS TRUE)           AS bioplastic_active,
        COUNT(*) FILTER (WHERE genome_acc IS NOT NULL AND genome_acc != '') AS genome_count,
        COUNT(*) FILTER (WHERE bd_found IS TRUE)                      AS bacdive_count,
        (SELECT COUNT(*) FROM organism_entries)                       AS total_entries,
        (SELECT COUNT(DISTINCT plastic) FROM organism_entries WHERE plastic != '') AS unique_plastics,
        COUNT(DISTINCT genus) FILTER (WHERE genus IS NOT NULL AND genus != '') AS unique_genera,
        COUNT(*) FILTER (WHERE COALESCE(sra_rc, 0) > 0)               AS sra_count,
        COUNT(*) FILTER (WHERE confidence_tier = 'Confirmed')         AS confirmed_count,
        COUNT(*) FILTER (WHERE confidence_tier = 'Predicted')         AS predicted_count,
        COUNT(*) FILTER (WHERE confidence_tier = 'Listed')            AS listed_count
      FROM organisms
    `);
    const r = rows[0];
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      total_organisms:  +r.total_organisms,
      bioplastic_active:+r.bioplastic_active,
      genome_count:     +r.genome_count,
      bacdive_count:    +r.bacdive_count,
      total_entries:    +r.total_entries,
      unique_plastics:  +r.unique_plastics,
      unique_genera:    +r.unique_genera,
      sra_count:        +r.sra_count,
      confirmed_count:  +r.confirmed_count,
      predicted_count:  +r.predicted_count,
      listed_count:     +r.listed_count,
    });
  } catch (err) { next(err); }
});

// ── GET /api/organisms/phylum ─────────────────────────────────────────────────
router.get('/phylum', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(phylum, ''), 'Unclassified') AS phylum,
        COUNT(*) FILTER (WHERE confidence_tier = 'Confirmed') AS confirmed,
        COUNT(*) FILTER (WHERE confidence_tier = 'Predicted') AS predicted,
        COUNT(*) FILTER (WHERE confidence_tier = 'Listed') AS listed,
        COUNT(*) AS total
      FROM organisms
      GROUP BY phylum
      ORDER BY confirmed DESC, total DESC
      LIMIT 100
    `);
    res.set('Cache-Control', 'public, max-age=300');
     res.json({
       phyla: rows.map(r => ({
         phylum: r.phylum,
         count: +(r.confirmed ?? r.cnt),
         confirmed: +(r.confirmed ?? r.cnt),
         predicted: +(r.predicted || 0),
         listed: +(r.listed || 0),
         total: +(r.total ?? r.cnt),
       })),
     });
  } catch (err) { next(err); }
});

// ── GET /api/organisms ────────────────────────────────────────────────────────
const SORT_COLS = {
  name:    'o.name ASC',
  taxid:   'o.taxid ASC',
  tier:     "CASE o.confidence_tier WHEN 'Confirmed' THEN 0 WHEN 'Predicted' THEN 1 ELSE 2 END, o.name ASC",
  novelty: 'o.nov DESC NULLS LAST, o.name',
  sra:     'o.sra_rc DESC NULLS LAST, o.name',
  pubmed:  'o.pm_total DESC NULLS LAST, o.name',
  entries: 'o.n_entries DESC NULLS LAST, o.name',
  year:    'o.first_year DESC NULLS LAST, o.name',
};

const FILTER_SQL = {
  bioplastic:  "o.bioplastic_relevant IS TRUE",
  conventional:"o.n_conventional > 0",
  genome:      "o.genome_acc IS NOT NULL AND o.genome_acc != ''",
  bacdive:     "o.bd_found IS TRUE",
  sra:         "COALESCE(o.sra_rc, 0) > 0",
  thermo:      "o.is_thermo IS TRUE",
  rt:          "o.is_rt IS TRUE",
};

const TIER_MAP = {
  confirmed: 'Confirmed',
  predicted: 'Predicted',
  listed:    'Listed',
};

router.get('/', async (req, res, next) => {
  try {
    const { q, filter, tier, phylum, sort = 'name', page = 1 } = req.query;
    const usesLegacyPageSize = req.query.pageSize !== undefined;
    const requestedPageSize = usesLegacyPageSize ? req.query.pageSize : req.query.per_page;
    const perPage = Math.min(
      usesLegacyPageSize ? MAX_PAGE_SIZE : 200,
      Math.max(1, +requestedPageSize || DEFAULT_PAGE_SIZE)
    );
    const pageNum = Math.max(1, +page || 1);
    const sortClause = SORT_COLS[sort];
    if (!sortClause) {
      return res.status(400).json({
        error: `sort must be one of: ${Object.keys(SORT_COLS).join(', ')}`,
      });
    }
    const conditions = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(
        o.name ILIKE $${params.length}
        OR o.genus ILIKE $${params.length}
        OR o.phylum ILIKE $${params.length}
        OR o.plastics ILIKE $${params.length}
      )`);
    }
    if (filter && FILTER_SQL[filter]) {
      conditions.push(FILTER_SQL[filter]);
    }
    if (tier) {
      const mappedTier = TIER_MAP[tier.toLowerCase()] ||
        (['Confirmed', 'Predicted', 'Listed'].includes(tier) ? tier : null);
      if (!mappedTier) {
        return res.status(400).json({ error: 'tier must be Confirmed, Predicted, or Listed' });
      }
      params.push(mappedTier);
      conditions.push(`o.confidence_tier = $${params.length}`);
    }
    if (phylum) {
      params.push(phylum);
      conditions.push(`o.phylum = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (pageNum - 1) * perPage;

    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT o.taxid, o.name, o.rank, o.phylum, o.class, o."order", o.family, o.genus,
                o.n_entries, o.n_plastics, o.n_bioplastic, o.n_conventional,
                o.bioplastic_relevant, o.has_sequence, o.has_enzyme, o.has_genbank,
                o.sra_rc, o.pm_total, o.pm_plastic,
                o.genome_acc, o.genome_level, o.bd_found,
                o.nov, o.first_year, o.last_year,
                o.plastics, o.plastics_cls,
                o.is_extra, o.is_expanded, o.is_thermo, o.is_rt,
                o.isolation_envs, o.isolation_locs,
                o.confidence_tier,
                o.rank AS org_rank, o.class AS org_class, o."order" AS org_order, o.family AS org_family
         FROM organisms o ${where}
         ORDER BY ${sortClause}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, perPage, offset]
      ),
      pool.query(`SELECT COUNT(*) AS total FROM organisms o ${where}`, params),
    ]);

    const total = +countRes.rows[0].total;
    const organisms = dataRes.rows.map(r => ({
      taxid:              r.taxid || null,
      name:               r.name,
      rank:               r.rank || '',
      genus:              r.genus,
      phylum:             r.phylum,
      class:              r.class || '',
      order:              r.order || '',
      family:             r.family || '',
      n_entries:          r.n_entries || 0,
      n_plastics:         r.n_plastics || 0,
      n_bioplastic:       r.n_bioplastic || 0,
      n_conventional:     r.n_conventional || 0,
      bioplastic_relevant:bool(r.bioplastic_relevant),
      has_sequence:       bool(r.has_sequence),
      has_enzyme:         bool(r.has_enzyme),
      has_genbank:        bool(r.has_genbank),
      sra_rc:             r.sra_rc || 0,
      pm_total:           r.pm_total || 0,
      pm_plastic:         r.pm_plastic || 0,
      genome_acc:         r.genome_acc || null,
      genome_level:       r.genome_level || null,
      bd_found:           bool(r.bd_found),
      nov:                r.nov || 0,
      first_year:         r.first_year || null,
      last_year:          r.last_year || null,
      plastics:           parseJson(r.plastics),
      plastics_cls:       parseJson(r.plastics_cls),
      is_extra:           bool(r.is_extra),
      is_expanded:        bool(r.is_expanded),
      is_thermo:          bool(r.is_thermo),
      is_rt:              bool(r.is_rt),
      isolation_envs:     r.isolation_envs || null,
      isolation_locs:     r.isolation_locs || null,
      confidence_tier:    r.confidence_tier || 'Listed',
      org_rank:           r.org_rank || '',
      org_class:          r.org_class || '',
      org_order:          r.org_order || '',
      org_family:         r.org_family || '',
    }));

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      total,
      page:     pageNum,
      per_page: perPage,
      pageSize: perPage,
      pages:    Math.max(1, Math.ceil(total / perPage)),
      organisms,
    });
  } catch (err) { next(err); }
});

async function sendDetail(req, res, next, lookup) {
  try {
    const identifier = lookup === 'taxid' ? req.params.taxid : req.params.name;

    let orgRes;
    if (lookup === 'taxid') {
      orgRes = await pool.query('SELECT * FROM organisms WHERE taxid = $1', [identifier]);
    } else {
      orgRes = await pool.query('SELECT * FROM organisms WHERE name = $1', [identifier]);
      if (!orgRes.rows.length) {
        orgRes = await pool.query('SELECT * FROM organisms WHERE LOWER(name) = LOWER($1)', [identifier]);
      }
    }
    if (!orgRes.rows.length) {
      return res.status(404).json({ error: `Organism '${identifier}' not found` });
    }

    const row = orgRes.rows[0];

    const entryRes = await pool.query(
      `SELECT plastic, cls, year, enzyme, family, has_seq, has_gb, env, loc, doi
       FROM organism_entries WHERE organism = $1 ORDER BY year DESC`,
      [row.name]
    );

    const entries = entryRes.rows.map(e => ({
      pl:  e.plastic,
      plastic: e.plastic,
      cls: e.cls,
      yr:  e.year || null,
      year: e.year || null,
      enz: e.enzyme,
      enzyme: e.enzyme,
      fam: e.family,
      family: e.family,
      seq: bool(e.has_seq),
      has_seq: bool(e.has_seq),
      gb:  bool(e.has_gb),
      has_gb: bool(e.has_gb),
      env: e.env || null,
      loc: e.loc || null,
      doi: e.doi || null,
    }));

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      ...row,
      taxid:            row.taxid || null,
      name:             row.name,
      tax_id:           row.taxid ? String(row.taxid) : null,
      genus:            row.genus || null,
      phylum:           row.phylum || null,
      n_entries:        row.n_entries || 0,
      n_plastics:       row.n_plastics || 0,
      n_bio:            row.n_bioplastic || 0,
      n_conv:           row.n_conventional || 0,
      bioplastic_relevant: bool(row.bioplastic_relevant),
      has_seq:          bool(row.has_sequence),
      has_enz:          bool(row.has_enzyme),
      has_gb:           bool(row.has_genbank),
      plastics:         parseJson(row.plastics),
      plastics_cls:     parseJson(row.plastics_cls),
      fy:               row.first_year || null,
      ly:               row.last_year || null,
      iso_envs:         row.isolation_envs || null,
      iso_locs:         row.isolation_locs || null,
      is_extra:         bool(row.is_extra),
      is_expanded:      bool(row.is_expanded),
      is_thermo:        bool(row.is_thermo),
      is_rt:            bool(row.is_rt),
      g_size:           row.genome_size || null,
      g_level:          row.genome_level || null,
      g_acc:            row.genome_acc || null,
      g_name:           row.genome_name || null,
      g_n50:            row.genome_n50 || null,
      g_cov:            row.genome_cov || null,
      g_taxid:          row.genome_taxid || null,
      bd_found:         bool(row.bd_found),
      bd_id:            row.bd_id || null,
      bd_url:           row.bd_url || null,
      bd_temp:          row.bd_temp || null,
      bd_ph:            row.bd_ph || null,
      bd_oxy:           row.bd_oxy || null,
      bd_morph:         row.bd_morph || null,
      bd_iso:           row.bd_iso || null,
      pm_plastic:       row.pm_plastic || 0,
      pm_total:         row.pm_total || 0,
      nov:              row.nov || 0,
      nov_breadth:      row.nov_breadth || 0,
      nov_rarity:       row.nov_rarity || 0,
      nov_recency:      row.nov_recency || 0,
      nov_gap:          row.nov_gap || 0,
      nov_last_yr:      row.nov_last_yr || null,
      nov_n_plastics:   row.nov_n_plastics || 0,
      rt_max:           row.rt_max || null,
      rt_mean:          row.rt_mean || null,
      sra_rc:           row.sra_rc || 0,
      sra_plat:         row.sra_plat || null,
      sra_strat:        row.sra_strat || null,
      sra_bases:        row.sra_bases || null,
      sra_dates:        row.sra_dates || null,
      pp:               parseJson(row.pp),
      ch_pl_labels:     parseJson(row.ch_pl_labels),
      ch_pl_values:     parseJson(row.ch_pl_values),
      ch_pl_colors:     parseJson(row.ch_pl_colors),
      ch_yr_labels:     parseJson(row.ch_yr_labels),
      ch_yr_values:     parseJson(row.ch_yr_values),
      ch_ev_labels:     parseJson(row.ch_ev_labels),
      ch_ev_values:     parseJson(row.ch_ev_values),
      ch_fam_labels:    parseJson(row.ch_fam_labels),
      ch_fam_values:    parseJson(row.ch_fam_values),
      confidence_tier:  row.confidence_tier || 'Listed',
      org_rank:         row.rank || '',
      org_class:        row.class || '',
      org_order:        row.order || '',
      org_family:       row.family || '',
      entries,
    });
  } catch (err) { next(err); }
}

// Existing API contract: taxid identifies a single organism. This route remains
// stable for current consumers and for target-repository test injection.
router.get('/:taxid', (req, res, next) => {
  if (!/^\d+$/.test(req.params.taxid)) {
    return res.status(400).json({ error: 'taxid must be a positive integer' });
  }
  const taxid = Number(req.params.taxid);
  if (!Number.isInteger(taxid) || taxid < 1) {
    return res.status(400).json({ error: 'taxid must be a positive integer' });
  }
  return sendDetail(req, res, next, 'taxid');
});

// Atlas UI contract: organism names can contain spaces and taxonomy labels. Keep
// this separate from the legacy taxid path so old integrations do not change.
router.get('/by-name/:name(*)', (req, res, next) => sendDetail(req, res, next, 'name'));

return router;
}

export default createOrganismsRouter(defaultPool);
