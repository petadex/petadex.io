// backend/src/lib/bacdiveMeansCache.js
//
// Denis BacDive CSV #3: per-biosample average optimum temperature / pH.
// Join key: biosample ID ↔ sra_metadata.biosample (PETadex BioSamples).
//
// Source (default): 
//   https://petabite.s3.us-east-1.amazonaws.com/automated-metadata/bacdive_data_analysis/biosample_bacdive_means.csv
// Override: BACDIVE_MEANS_URL or BACDIVE_MEANS_PATH (local file).
// Soft-fails when S3 is private (403) or file missing.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'bacdive-biosample-means.json');

const DEFAULT_URL =
  process.env.BACDIVE_MEANS_URL ||
  'https://petabite.s3.us-east-1.amazonaws.com/automated-metadata/bacdive_data_analysis/biosample_bacdive_means.csv';

const LOCAL_PATH =
  process.env.BACDIVE_MEANS_PATH ||
  path.join(__dirname, '../../data/biosample_bacdive_means.csv');

/** @type {Map<string, object> | null} */
let byBiosample = null;
/** @type {{ status: string, n_rows?: number, source?: string, reason?: string, loaded_at?: string } | null} */
let meta = null;
let loadPromise = null;

const HEADER_ALIASES = {
  biosample: [
    'biosampleid',
    'biosample_id',
    'biosample',
    'biosample_accession',
    'sample_id',
  ],
  n_organisms_temp: [
    'n_organisms_temp',
    'num_organisms_temp',
    'n_org_temp',
    'number_of_organisms_to_calculate_avg_optimum_temp',
    'numberoforganismstocalculateavgoptimumtemp',
    'n_temp',
  ],
  avg_optimum_temp: [
    'avg_optimum_temp',
    'average_optimum_temp',
    'avg_opt_temp',
    'mean_optimum_temp',
    'avg_temp',
    'averageoptimumtemp',
  ],
  n_organisms_ph: [
    'n_organisms_ph',
    'num_organisms_ph',
    'n_org_ph',
    'number_of_organisms_for_ph',
    'numberoforganismsforph',
    'n_ph',
  ],
  avg_optimum_ph: [
    'avg_optimum_ph',
    'average_optimum_ph',
    'avg_opt_ph',
    'mean_optimum_ph',
    'avg_ph',
    'averageoptimumph',
  ],
};

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function normHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function resolveColumn(headers, aliases) {
  const set = new Map(headers.map((h, i) => [normHeader(h), i]));
  for (const a of aliases) {
    const key = normHeader(a);
    if (set.has(key)) return set.get(key);
  }
  // fuzzy: header contains alias tokens
  for (const [h, i] of set) {
    for (const a of aliases) {
      const na = normHeader(a);
      if (h.includes(na) || na.includes(h)) return i;
    }
  }
  return -1;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function toInt(v) {
  const n = toNum(v);
  return n == null ? null : Math.round(n);
}

/**
 * @param {string} text
 * @returns {Map<string, object>}
 */
export function parseBacdiveMeansCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return new Map();

  const headers = parseCsvLine(lines[0]);
  const iBio = resolveColumn(headers, HEADER_ALIASES.biosample);
  const iNt = resolveColumn(headers, HEADER_ALIASES.n_organisms_temp);
  const iAt = resolveColumn(headers, HEADER_ALIASES.avg_optimum_temp);
  const iNp = resolveColumn(headers, HEADER_ALIASES.n_organisms_ph);
  const iAp = resolveColumn(headers, HEADER_ALIASES.avg_optimum_ph);

  if (iBio < 0) {
    throw new Error(
      `BacDive means CSV missing biosample column (saw: ${headers.join(', ')})`,
    );
  }

  const map = new Map();
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    const biosample = String(cols[iBio] || '').trim();
    if (!biosample) continue;
    map.set(biosample, {
      biosample,
      n_organisms_temp: iNt >= 0 ? toInt(cols[iNt]) : null,
      avg_optimum_temp: iAt >= 0 ? toNum(cols[iAt]) : null,
      n_organisms_ph: iNp >= 0 ? toInt(cols[iNp]) : null,
      avg_optimum_ph: iAp >= 0 ? toNum(cols[iAp]) : null,
      source: 'bacdive_means',
    });
  }
  return map;
}

function saveDiskCache(map, source) {
  ensureDir();
  const payload = {
    loaded_at: new Date().toISOString(),
    source,
    n_rows: map.size,
    rows: [...map.values()],
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload));
  return payload;
}

function loadDiskCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (!Array.isArray(raw?.rows)) return null;
    const map = new Map();
    for (const row of raw.rows) {
      if (row?.biosample) map.set(String(row.biosample), row);
    }
    byBiosample = map;
    meta = {
      status: 'ready',
      n_rows: map.size,
      source: raw.source || 'disk-cache',
      loaded_at: raw.loaded_at,
    };
    return map;
  } catch {
    return null;
  }
}

async function readSourceText() {
  if (fs.existsSync(LOCAL_PATH)) {
    return {
      text: fs.readFileSync(LOCAL_PATH, 'utf8'),
      source: `file:${LOCAL_PATH}`,
    };
  }

  const res = await fetch(DEFAULT_URL, {
    signal: AbortSignal.timeout(120_000),
    headers: { Accept: 'text/csv,*/*' },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} fetching BacDive means CSV`);
    err.status = res.status;
    err.url = DEFAULT_URL;
    throw err;
  }
  return { text: await res.text(), source: DEFAULT_URL };
}

/**
 * Load (or return) in-memory BacDive means index.
 * Concurrent callers share one in-flight load.
 */
export function ensureBacdiveMeansCache({ force = false } = {}) {
  if (!force && byBiosample) return Promise.resolve(byBiosample);
  if (!force) {
    const disk = loadDiskCache();
    if (disk && disk.size) return Promise.resolve(disk);
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      console.log('[bacdiveMeans] loading biosample means CSV…');
      const { text, source } = await readSourceText();
      const map = parseBacdiveMeansCsv(text);
      byBiosample = map;
      meta = {
        status: 'ready',
        n_rows: map.size,
        source,
        loaded_at: new Date().toISOString(),
      };
      saveDiskCache(map, source);
      console.log(`[bacdiveMeans] loaded ${map.size} biosamples from ${source}`);
      return map;
    } catch (err) {
      // Do not keep an empty Map in memory — that would block later local-file loads.
      byBiosample = null;
      meta = {
        status: 'unavailable',
        n_rows: 0,
        reason: err.message,
        url: err.url || DEFAULT_URL,
        http_status: err.status || null,
        local_path: LOCAL_PATH,
        loaded_at: new Date().toISOString(),
      };
      console.warn('[bacdiveMeans] unavailable:', err.message);
      return new Map();
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function getBacdiveForBiosample(biosampleId) {
  if (!biosampleId || !byBiosample) return null;
  return byBiosample.get(String(biosampleId)) || null;
}

export function getBacdiveMeansMeta() {
  if (meta) return meta;
  loadDiskCache();
  return (
    meta || {
      status: 'cold',
      n_rows: 0,
      url: DEFAULT_URL,
      local_path: LOCAL_PATH,
    }
  );
}

// Kick off background load on import (no-op if already cached / will soft-fail).
ensureBacdiveMeansCache().catch(() => {});
