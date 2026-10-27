import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createSequenceSamplesRouter } from './sequenceSamples.js';

// The router on a throwaway app, with the orchestrator invoke replaced by
// whatever the current test sets. No AWS, no database.
let respond = async () => ({});
const calls = [];
let server;
let base;

before(async () => {
  const app = express();
  app.use('/api/sequence', createSequenceSamplesRouter({
    invoke: async id => {
      calls.push(id);
      return respond(id);
    },
  }));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/sequence`;
});

after(() => server.close());

const record = id => ({
  id,
  n_biosamples: 512,
  n_bioprojects: 40,
  samples: [{ biosample: 'SAMN00000001', bioproject: 'PRJNA1', n_runs: 3, profile: 'compost' }],
});

test('200 passes the orchestrator body through, from an object or a JSON string', async () => {
  respond = async id => ({ statusCode: 200, body: record(id) });
  let res = await fetch(`${base}/LG113721682/samples`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=3600');
  assert.deepEqual(await res.json(), record('LG113721682'));

  respond = async id => ({ statusCode: 200, body: JSON.stringify(record(id)) });
  res = await fetch(`${base}/LG1/samples`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).n_biosamples, 512);
});

test('400 for anything but a Logan id, without invoking the orchestrator', async () => {
  calls.length = 0;
  for (const id of ['NR223', 'PL1', 'LG', 'lg12', 'LG12abc', '1|WP_054022242.1|||||']) {
    const res = await fetch(`${base}/${encodeURIComponent(id)}/samples`);
    assert.equal(res.status, 400, id);
  }
  assert.deepEqual(calls, []);
});

test('404 when the store has no record', async () => {
  respond = async () => ({ statusCode: 404, body: { error: 'not found' } });
  const res = await fetch(`${base}/LG5/samples`);
  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /LG5/);
});

test('503 for any other orchestrator status, e.g. the action not deployed yet', async () => {
  respond = async () => ({ statusCode: 400, body: JSON.stringify({ error: 'unknown action: samples' }) });
  const res = await fetch(`${base}/LG5/samples`);
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('cache-control'), null);
  assert.equal((await res.json()).upstream_status, 400);
});

test('503 when the invoke itself fails (timeout, FunctionError, network)', async () => {
  respond = async () => { throw new Error('socket timeout'); };
  const res = await fetch(`${base}/LG5/samples`);
  assert.equal(res.status, 503);
});

test('503 when a 200 describes a different id or has no samples list', async () => {
  respond = async () => ({ statusCode: 200, body: record('LG999') });
  assert.equal((await fetch(`${base}/LG5/samples`)).status, 503);
  respond = async id => ({ statusCode: 200, body: { id, n_biosamples: 1 } });
  assert.equal((await fetch(`${base}/LG5/samples`)).status, 503);
});
