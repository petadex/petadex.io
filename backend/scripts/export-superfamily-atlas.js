/**
 * Export the v260701 superfamily atlas (`superfamily_atlas` materialized view) to a gzipped
 * JSON object in S3, served statically to /atlas and the homepage hero.
 *
 * Same delivery as export-atlas.js (the payload exceeds AWS Lambda's 6 MB response limit),
 * but a separate key, so the legacy family atlas (atlas/umap.json.gz, still used by family
 * pages and search results) is left untouched.
 *
 * Run after refreshing the superfamily_atlas view:
 *   npm run export-superfamily-atlas            # upload
 *   npm run export-superfamily-atlas -- --dry-run [--out file.json.gz]   # write locally only
 *
 * Object: s3://$RESULTS_BUCKET/$SUPERFAMILY_ATLAS_S3_KEY (default atlas/v260701/superfamilies.json.gz)
 * Shape:  { version, layouts: [{layout,label,embedding,parameters,date_computed,date_clustered}], points: [...] }
 */

import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../src/db.js';
import { SUPERFAMILY_ATLAS_LAYOUTS, SUPERFAMILY_ATLAS_POINTS } from '../src/atlasQueries.js';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const RESULTS_BUCKET = process.env.RESULTS_BUCKET || 'petadex';
const KEY = process.env.SUPERFAMILY_ATLAS_S3_KEY || 'atlas/v260701/superfamilies.json.gz';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;

async function main() {
  console.log('Querying superfamily_atlas...');
  const { rows: layouts } = await pool.query(SUPERFAMILY_ATLAS_LAYOUTS);
  const { rows: points } = await pool.query(SUPERFAMILY_ATLAS_POINTS);
  console.log(`  ${points.length} points, layouts: ${layouts.map(l => l.layout).join(', ')}`);
  if (!points.length || !layouts.length) throw new Error('superfamily_atlas is empty');
  for (const l of layouts) {
    const missing = points.filter(p => p[`${l.layout}_x`] == null || p[`${l.layout}_y`] == null).length;
    if (missing) throw new Error(`${missing} points lack ${l.layout} coordinates`);
  }

  const json = JSON.stringify({ version: 'v260701', layouts, points });
  const gz = gzipSync(json, { level: 9 });
  console.log(`  ${(json.length / 1e6).toFixed(2)} MB JSON -> ${(gz.length / 1e6).toFixed(2)} MB gzip`);

  if (outFile) {
    writeFileSync(outFile, gz);
    console.log(`Wrote ${outFile}`);
  }
  if (dryRun) {
    console.log('Dry run: not uploaded.');
    return;
  }
  const s3 = new S3Client({ region: AWS_REGION });
  await s3.send(
    new PutObjectCommand({
      Bucket: RESULTS_BUCKET,
      Key: KEY,
      Body: gz,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      CacheControl: 'public, max-age=3600',
    })
  );
  console.log(`Uploaded s3://${RESULTS_BUCKET}/${KEY}`);
}

main()
  .catch(err => {
    console.error('export-superfamily-atlas failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
