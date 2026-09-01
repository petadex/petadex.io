/**
 * Integration tests for the Organism Atlas API contract.
 *
 * The real Express router and SQL generation are exercised with a mocked
 * PostgreSQL pool, so these tests do not require database credentials.
 *
 * Run: cd backend && npm test
 */
import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';
import http from 'node:http';
import express from 'express';
import { createOrganismsRouter } from '../organisms.js';

const ORGANISM = {
  taxid: 286,
  name: 'Pseudomonas aeruginosa',
  rank: 'species',
  genus: 'Pseudomonas',
  phylum: 'Proteobacteria',
  confidence_tier: 'Confirmed',
  n_entries: 5,
  n_bioplastic: 2,
  n_conventional: 1,
  bioplastic_relevant: true,
  has_sequence: true,
  has_enzyme: true,
  has_genbank: true,
  sra_rc: 4,
  pm_total: 3,
  pm_plastic: 2,
  genome_acc: 'GCF_000006765',
  genome_level: 'Complete',
  bd_found: true,
  nov: 82,
  first_year: 2016,
  last_year: 2022,
  plastics: JSON.stringify(['PET', 'LDPE']),
  plastics_cls: JSON.stringify(['Conventional', 'Conventional']),
  is_thermo: false,
  is_rt: true,
  isolation_envs: 'soil',
  isolation_locs: 'Japan',
};

const ENTRY = {
  plastic: 'PET',
  cls: 'Conventional',
  year: 2016,
  enzyme: 'IsPETase',
  family: 'Cutinase',
  has_seq: true,
  has_gb: true,
  env: 'soil',
  loc: 'Japan',
  doi: '10.1126/science.aal4526',
};

const STATS = {
  total_organisms: '1',
  bioplastic_active: '1',
  genome_count: '1',
  bacdive_count: '1',
  total_entries: '5',
  unique_plastics: '2',
  unique_genera: '1',
  sra_count: '1',
  confirmed_count: '1',
  predicted_count: '0',
  listed_count: '0',
};

function makeMockPool() {
  return {
    async query(sql, params = []) {
      const statement = sql.replace(/\s+/g, ' ').toLowerCase().trim();
      const firstParam = params[0];

      if (statement.includes('count(distinct genus)')) return { rows: [STATS] };
      if (statement.includes('select coalesce(nullif(phylum')) {
        return { rows: [{ phylum: 'Proteobacteria', cnt: '1' }] };
      }
      if (statement.includes('select plastic, cls, year, enzyme')) return { rows: [ENTRY] };
      if (statement.includes('where taxid = $1')) {
        return { rows: Number(firstParam) === ORGANISM.taxid ? [ORGANISM] : [] };
      }
      if (statement.includes('where name = $1') || statement.includes('lower(name) = lower($1)')) {
        return { rows: firstParam === 'Unknown organism' ? [] : [ORGANISM] };
      }
      if (statement.startsWith('select count(*) as total')) return { rows: [{ total: '1' }] };
      if (statement.includes('from organisms o')) return { rows: [ORGANISM] };
      return { rows: [] };
    },
  };
}

function buildApp(pool) {
  const app = express();
  app.use('/api/organisms', createOrganismsRouter(pool));
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
  return app;
}

function request(server, path) {
  return fetch(`http://localhost:${server.address().port}${path}`).then(async response => ({
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  }));
}

let server;

before(async () => {
  server = http.createServer(buildApp(makeMockPool())).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
});

after(() => {
  server.close();
});

describe('GET /api/organisms/stats', () => {
  it('returns all stats as numbers', async () => {
    const { status, body } = await request(server, '/api/organisms/stats');
    assert.equal(status, 200);
    assert.equal(body.total_organisms, 1);
    assert.equal(typeof body.unique_plastics, 'number');
    assert.equal(body.confirmed_count, 1);
  });
});

describe('GET /api/organisms', () => {
  it('returns the documented list and pagination shape', async () => {
    const { status, body } = await request(
      server,
      '/api/organisms?page=2&per_page=1&tier=confirmed&sort=novelty&q=Pseudomonas',
    );
    assert.equal(status, 200);
    assert.equal(body.page, 2);
    assert.equal(body.per_page, 1);
    assert.equal(body.pages, 1);
    assert.equal(body.total, 1);
    assert.ok(Array.isArray(body.organisms));
    assert.equal(body.organisms[0].name, ORGANISM.name);
    assert.equal(typeof body.organisms[0].bioplastic_relevant, 'boolean');
  });

  it('clamps per_page to the documented maximum', async () => {
    const { body } = await request(server, '/api/organisms?per_page=9999');
    assert.equal(body.per_page, 200);
  });

  it('preserves phylum filtering and the legacy pageSize alias', async () => {
    const { body } = await request(
      server,
      '/api/organisms?phylum=Proteobacteria&pageSize=9999',
    );
    assert.equal(body.pageSize, 500);
    assert.equal(body.per_page, 500);
    assert.equal(body.organisms[0].phylum, 'Proteobacteria');
  });

  it('sets a public cache header', async () => {
    const { headers } = await request(server, '/api/organisms');
    assert.equal(headers.get('cache-control'), 'public, max-age=300');
  });
});

describe('GET /api/organisms/phylum', () => {
  it('returns confirmed phylum counts', async () => {
    const { status, body } = await request(server, '/api/organisms/phylum');
    assert.equal(status, 200);
    assert.equal(body.phyla[0].phylum, 'Proteobacteria');
    assert.equal(body.phyla[0].count, 1);
    assert.equal(body.phyla[0].confirmed, 1);
  });
});

describe('GET /api/organisms/by-name/:name', () => {
  it('returns the organism and joined PlasticDB entries', async () => {
    const { status, body } = await request(
      server,
      `/api/organisms/by-name/${encodeURIComponent(ORGANISM.name)}`,
    );
    assert.equal(status, 200);
    assert.equal(body.name, ORGANISM.name);
    assert.equal(body.tax_id, String(ORGANISM.taxid));
    assert.ok(Array.isArray(body.entries));
    assert.equal(body.entries[0].doi, ENTRY.doi);
    assert.deepEqual(body.plastics, ['PET', 'LDPE']);
  });

  it('supports case-insensitive name fallback and 404 responses', async () => {
    const found = await request(server, '/api/organisms/by-name/PSEUDOMONAS%20AERUGINOSA');
    assert.equal(found.status, 200);

    const missing = await request(server, '/api/organisms/by-name/Unknown%20organism');
    assert.equal(missing.status, 404);
    assert.match(missing.body.error, /not found/i);
  });

  it('sets a public cache header', async () => {
    const { headers } = await request(
      server,
      `/api/organisms/by-name/${encodeURIComponent(ORGANISM.name)}`,
    );
    assert.equal(headers.get('cache-control'), 'public, max-age=300');
  });
});

describe('GET /api/organisms/:taxid', () => {
  it('preserves the existing TaxID detail endpoint', async () => {
    const { status, body } = await request(server, `/api/organisms/${ORGANISM.taxid}`);
    assert.equal(status, 200);
    assert.equal(body.taxid, ORGANISM.taxid);
    assert.equal(body.has_sequence, true);
    assert.equal(body.rank, 'species');
    assert.equal(body.entries[0].plastic, ENTRY.plastic);
    assert.equal(body.entries[0].year, ENTRY.year);
  });

  it('rejects a non-numeric TaxID instead of treating it as a name', async () => {
    const { status } = await request(server, '/api/organisms/not-a-taxid');
    assert.equal(status, 400);
  });
});