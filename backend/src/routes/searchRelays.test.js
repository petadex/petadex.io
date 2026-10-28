import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import express from 'express';
import { createSearchSamplesRouter, createSearchAlignRouter } from './searchRelays.js';

// Both routers on a throwaway app, with the orchestrator invoke replaced by
// whatever the current test sets. No AWS, no database.
let respond = async () => ({});
const calls = [];
let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  const invoke = async payload => {
    calls.push(payload);
    return respond(payload);
  };
  app.use('/api/search/samples', createSearchSamplesRouter({ invoke }));
  app.use('/api/search/align', createSearchAlignRouter({ invoke }));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/search`;
});

after(() => server.close());

const post = (path, body) =>
  fetch(`${base}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

// The real ISPETase batch body (375 Logan hits), as the orchestrator returns it.
const batch = JSON.parse(
  readFileSync(new URL('./fixtures/samples-batch-ispetase.json', import.meta.url), 'utf8'),
);

/* ── samples ─────────────────────────────────────────────────────────────── */

test('samples: relays the batch action and passes the real body through', async () => {
  calls.length = 0;
  respond = async () => ({ statusCode: 200, body: JSON.stringify(batch) });
  const ids = Object.keys(batch.results);
  const res = await post('samples', { ids });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=3600');
  const body = await res.json();
  assert.equal(Object.keys(body.results).length, 375);
  assert.equal(Object.keys(body.biosamples).length, 475);
  assert.deepEqual(calls, [{ action: 'samples', ids, limit: 50 }]);
});

test('samples: 400 before invoking, for anything but 1–500 distinct Logan ids', async () => {
  calls.length = 0;
  const bad = [
    {},
    { ids: [] },
    { ids: ['NR1'] },
    { ids: ['LG1', 'LG1'] },
    { ids: Array.from({ length: 501 }, (_, i) => `LG${i + 1}`) },
    { ids: ['LG1'], limit: 0 },
    { ids: ['LG1'], limit: 201 },
  ];
  for (const body of bad) {
    const res = await post('samples', body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.deepEqual(calls, []);
});

test('samples: orchestrator 400 stays 400; other errors and odd bodies are 503', async () => {
  respond = async () => ({ statusCode: 400, body: { error: 'response over 5 MB' } });
  let res = await post('samples', { ids: ['LG1'] });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /5 MB/);

  respond = async () => ({ statusCode: 503, body: { error: 'no store' } });
  res = await post('samples', { ids: ['LG1'] });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).upstream_status, 503);

  respond = async () => ({ statusCode: 200, body: { status: 'ok' } });
  res = await post('samples', { ids: ['LG1'] });
  assert.equal(res.status, 503);

  respond = async () => {
    throw new Error('timeout');
  };
  res = await post('samples', { ids: ['LG1'] });
  assert.equal(res.status, 503);
});

/* ── align ───────────────────────────────────────────────────────────────── */

const ready = {
  status: 'ready',
  session_id: 'regen_example_ispetase',
  job_id: 'j1',
  key: 'default',
  n_sequences: 3,
  ids: ['PL1', 'NR1455'],
  afa: '>query\nMN-F\n>PL1\nMNAF\n>NR1455\nMN-F\n',
  newick: '(query:0.1,PL1:0.2,NR1455:0.1);\n',
};

test('align: relays every field, any status at 200, never cached', async () => {
  calls.length = 0;
  respond = async () => ({ statusCode: 200, body: JSON.stringify(ready) });
  let res = await post('align', { sessionId: 'regen_example_ispetase' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await res.json(), ready);

  respond = async () => ({ statusCode: 200, body: { status: 'running', n_sequences: 125 } });
  res = await post('align', { sessionId: 'a'.repeat(32), jobId: 'j1', ids: ['PL1'], poll: true });
  assert.equal((await res.json()).status, 'running');
  assert.deepEqual(calls[1], {
    action: 'align',
    sessionId: 'a'.repeat(32),
    jobId: 'j1',
    ids: ['PL1'],
    poll: true,
  });
});

test('align: 400 before invoking for a bad sessionId or id list', async () => {
  calls.length = 0;
  const bad = [
    {},
    { sessionId: '../etc' },
    { sessionId: 'abc', ids: [] },
    { sessionId: 'abc', ids: ['XX1'] },
    { sessionId: 'abc', ids: Array.from({ length: 201 }, (_, i) => `LG${i + 1}`) },
  ];
  for (const body of bad) {
    const res = await post('align', body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.deepEqual(calls, []);
});

test('align: 400 and 404 pass through; 503, other errors and odd bodies are 503', async () => {
  respond = async () => ({ statusCode: 400, body: { error: 'not hits of this result: LG9' } });
  let res = await post('align', { sessionId: 'abc', ids: ['LG9'] });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /LG9/);

  respond = async () => ({ statusCode: 404, body: { status: 'none', error: 'no such search result' } });
  res = await post('align', { sessionId: 'abc' });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).status, 'none');

  respond = async () => ({ statusCode: 503, body: { status: 'unavailable', error: 'alignment is not configured' } });
  res = await post('align', { sessionId: 'abc' });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /not configured/);

  respond = async () => ({ statusCode: 200, body: { afa: '' } });
  res = await post('align', { sessionId: 'abc' });
  assert.equal(res.status, 503);

  respond = async () => {
    throw new Error('timeout');
  };
  res = await post('align', { sessionId: 'abc' });
  assert.equal(res.status, 503);
});
