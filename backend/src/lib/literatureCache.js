// backend/src/lib/literatureCache.js
//
// PAZy-first plastic_degradation_literature fixture (Thomas schema).
// Default: backend/data/literature_pazy_fixture.json
// Override: LITERATURE_PATH (local JSON file).
// Soft-fails when file missing — empty papers list.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(
  __dirname,
  '../../data/literature_pazy_fixture.json',
);

/** @type {Map<string, object> | null} */
let byDoi = null;
/** @type {{ status: string, n_papers?: number, source?: string, reason?: string, loaded_at?: string } | null} */
let meta = null;
let loadPromise = null;

function normalizeDoi(doi) {
  return String(doi || '')
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .toLowerCase();
}

function loadFromFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : parsed.papers || [];
  const map = new Map();
  for (const row of rows) {
    const doi = normalizeDoi(row.doi);
    if (!doi) continue;
    map.set(doi, {
      doi: String(row.doi).trim(),
      paper_title: row.paper_title ?? null,
      authors: Array.isArray(row.authors) ? row.authors : [],
      date_published: row.date_published ?? null,
      paper_summary: row.paper_summary ?? null,
      citations_in_dataset: Array.isArray(row.citations_in_dataset)
        ? row.citations_in_dataset.map(String)
        : [],
      plastics_studied: Array.isArray(row.plastics_studied)
        ? row.plastics_studied
        : [],
      proteins_studied_count:
        row.proteins_studied_count == null
          ? null
          : Number(row.proteins_studied_count),
    });
  }
  return map;
}

async function ensureLoaded() {
  if (byDoi) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const filePath = process.env.LITERATURE_PATH || DEFAULT_PATH;
    try {
      if (!fs.existsSync(filePath)) {
        byDoi = new Map();
        meta = {
          status: 'unavailable',
          n_papers: 0,
          source: filePath,
          reason: 'file_missing',
          loaded_at: new Date().toISOString(),
        };
        return;
      }
      byDoi = loadFromFile(filePath);
      meta = {
        status: 'ok',
        n_papers: byDoi.size,
        source: filePath,
        loaded_at: new Date().toISOString(),
      };
    } catch (err) {
      byDoi = new Map();
      meta = {
        status: 'error',
        n_papers: 0,
        source: filePath,
        reason: err.message || String(err),
        loaded_at: new Date().toISOString(),
      };
    }
  })();
  return loadPromise;
}

export async function getLiteratureStatus() {
  await ensureLoaded();
  return meta;
}

export async function listLiteraturePapers() {
  await ensureLoaded();
  return [...(byDoi?.values() || [])];
}

export async function getLiteraturePaper(doi) {
  await ensureLoaded();
  const key = normalizeDoi(doi);
  return byDoi?.get(key) || null;
}

/** Test helper / cache bust after fixture update. */
export function resetLiteratureCache() {
  byDoi = null;
  meta = null;
  loadPromise = null;
}
