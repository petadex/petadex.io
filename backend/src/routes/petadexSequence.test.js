import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { parseId, PETADEX_ID_RE } from '../lib/v260701.js';
import { sequenceRouter } from './petadexSequence.js';

test('parseId accepts PL/NR/LG + integer without leading zero, rejects everything else', () => {
  assert.deepEqual(parseId('PL1'), { prefix: 'PL', n: 1 });
  assert.deepEqual(parseId('LG1743143905'), { prefix: 'LG', n: 1743143905 });
  assert.deepEqual(parseId(' NR223 '), { prefix: 'NR', n: 223 });
  for (const bad of ['', 'PL0', 'PL01', 'pl1', 'XX1', 'WP_054022242.1', '1JFR_A', '114593962', 'LG1|C001', null, undefined]) {
    assert.equal(parseId(bad), null, String(bad));
  }
  assert.ok(PETADEX_ID_RE.test('LG113721682'));
});

// Non-petadex ids must fall through so the existing /api/sequence/:id/samples relay and anything mounted after
// this router keep working. No database or S3 is touched for these paths.
let server, base;
before(async () => {
  const app = express();
  app.use('/api/sequence', sequenceRouter);
  app.use('/api/sequence', (req, res) => res.status(299).json({ fell_through: req.path }));
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/sequence`;
});
after(() => server.close());

test('non-petadex ids fall through to the next router', async () => {
  for (const id of ['WP_054022242.1', '114593962', 'pl0']) {
    const res = await fetch(`${base}/${encodeURIComponent(id)}`);
    assert.equal(res.status, 299, id);
  }
  const res = await fetch(`${base}/LG1/samples`);
  assert.equal(res.status, 299);
});
