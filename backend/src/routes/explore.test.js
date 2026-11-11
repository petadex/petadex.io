import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import exploreRoutes from './explore.js';

// Validation happens before any database or S3 access, so these run without either.
let server, base;
before(async () => {
  const app = express();
  app.use('/api/explore', exploreRoutes);
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/explore`;
});
after(() => server.close());

test('bad list parameters are 400s', async () => {
  for (const path of [
    '/superfamilies?sort=n_pl;drop', '/superfamilies?sort=best', '/superfamilies?order=up',
    '/superfamilies?fold=ABHYDROLASE', '/superfamilies?fold=a%27b', '/superfamilies?limit=0', '/superfamilies?limit=201',
    '/superfamilies?offset=-1', '/superfamilies?env=soil;x', '/superfamilies?has_plasticome=maybe',
    '/envs?fold=x%20y', '/random?kind=15', '/random?kind=family',
  ]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 400, path);
  }
});
