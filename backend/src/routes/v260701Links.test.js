import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import linkRoutes, { BIOSAMPLE_RE, RUN_RE } from './v260701Links.js';

test('accession patterns', () => {
  for (const ok of ['SAMN26101620', 'SAMEA1234', 'SAMD00012345', 'ERS123', 'SRS1']) assert.ok(BIOSAMPLE_RE.test(ok), ok);
  for (const ok of ['SRR18079661', 'ERR123', 'DRR000001']) assert.ok(RUN_RE.test(ok), ok);
  for (const bad of ['', 'SAMN', 'SAMN1;drop', 'PRJNA808732', 'LG1', 'SRR', 'SRX123', 'SRR1 2']) {
    assert.ok(!BIOSAMPLE_RE.test(bad) && !RUN_RE.test(bad), bad);
  }
});

// Validation happens before any database or S3 access, so these run without either.
let server, base;
before(async () => {
  const app = express();
  app.use('/api', linkRoutes);
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

test('bad accessions and bad paging are 400s', async () => {
  for (const path of ['/biosamples/PRJNA1/lgs', '/runs/SRX1/lgs', '/biosamples/SAMN1/lgs?limit=0',
                      '/biosamples/SAMN1/lgs?limit=501', '/runs/SRR1/lgs?offset=-1', '/runs/SRR1/lgs?offset=x']) {
    const res = await fetch(base + path);
    assert.equal(res.status, 400, path);
  }
});
