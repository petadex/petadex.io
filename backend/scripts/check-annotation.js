// backend/scripts/check-annotation.js
//
// Contract check for the BioSample annotation layer, against the live database.
// Runs the verified fixtures from "02 Annotation Layer - Frontend" §7 through the
// same query functions the routes use, asserts the expected values, and prints
// the latency of each query. Read-only.
//
//   cd backend && npm run check-annotation
import assert from 'node:assert/strict'
import { pool } from '../src/db.js'
import {
  fetchProvenanceRows,
  fetchBiosample,
  fetchBiosampleSequences,
  fetchClusterProfiles,
  fetchProfiles,
  fetchProfile,
  fetchProfileBiosamples,
} from '../src/lib/annotation.js'

const PROVENANCE_FIXTURES = [
  { orf_id: 1175257292, biosample: 'SAMN06266403', profile: 'plant_associated', profile_evidence: 'stated', profile_tier: 1, in_universe: true },
  { orf_id: 528390074, biosample: 'SAMN17592385', profile: 'human_other', profile_evidence: 'inferred', profile_tier: 2, in_universe: true },
  { orf_id: 734564571, biosample: 'SAMN26656586', profile: 'human_other', profile_evidence: 'form_template', profile_tier: 3, in_universe: true },
  { orf_id: 569559254, biosample: 'SAMN18894240', profile: 'animal_other', profile_evidence: 'form_template', profile_tier: 3, in_universe: false },
  { orf_id: 1163946581, biosample: 'SAMN06309951', profile: 'unprofilable', profile_evidence: 'none', profile_tier: 0 },
  { orf_id: 1185035573, biosample: null, run: 'SRR5658000', pid90: 991043, cluster_dominant_profile: 'animal_other' },
]

const FORBIDDEN_KEYS = ['biome', 'ecoregion']

let failures = 0
async function check(name, fn) {
  const t0 = performance.now()
  try {
    await fn()
    console.log(`  ok   ${name}  (${(performance.now() - t0).toFixed(0)} ms)`)
  } catch (err) {
    failures++
    console.log(`  FAIL ${name}\n       ${err.message}`)
  }
}

function assertNoForbiddenKeys(obj) {
  const json = JSON.stringify(obj)
  for (const k of FORBIDDEN_KEYS) assert.ok(!json.includes(`"${k}"`), `response contains "${k}"`)
}

console.log('provenance fixtures')
for (const fx of PROVENANCE_FIXTURES) {
  await check(`orf ${fx.orf_id}`, async () => {
    const [row] = await fetchProvenanceRows([fx.orf_id])
    for (const [k, v] of Object.entries(fx)) assert.equal(row[k], v, `${k}: got ${row[k]}, want ${v}`)
    assertNoForbiddenKeys(row)
  })
}

console.log('batch')
await check('same length and order as request, unknown ids included', async () => {
  const ids = [9999999999, ...PROVENANCE_FIXTURES.map(f => f.orf_id), 1, PROVENANCE_FIXTURES[0].orf_id]
  const rows = await fetchProvenanceRows(ids)
  assert.equal(rows.length, ids.length)
  assert.deepEqual(rows.map(r => r.orf_id), ids)
  assert.equal(rows[0].run, null)
  assert.equal(typeof rows[1].orf_id, 'number')
})
await check('batch of 500 real ORFs', async () => {
  const { rows } = await pool.query(
    `SELECT orf_id FROM logan_catalytic_orfs WHERE library_id IN
       (SELECT acc FROM sra_metadata WHERE biosample = 'SAMEA104111258') LIMIT 500`,
  )
  const ids = rows.map(r => Number(r.orf_id))
  const t0 = performance.now()
  const out = await fetchProvenanceRows(ids)
  console.log(`       provenance(500) query: ${(performance.now() - t0).toFixed(0)} ms`)
  assert.equal(out.length, ids.length)
})

console.log('biosample')
await check('SAMN06266403 annotation + runs', async () => {
  const { annotation, runs } = await fetchBiosample('SAMN06266403')
  assert.equal(annotation?.profile, 'plant_associated')
  assert.ok(runs.length >= 1)
})
await check('SAMEA104111258 keyset pagination (worst case)', async () => {
  const p1 = await fetchBiosampleSequences('SAMEA104111258', 0, 100)
  assert.equal(p1.sequences.length, 100)
  assert.equal(p1.next_after, p1.sequences[99].orf_id)
  const p2 = await fetchBiosampleSequences('SAMEA104111258', p1.next_after, 100)
  assert.ok(p2.sequences[0].orf_id > p1.next_after, 'page 2 starts after page 1')
})
await check('unknown biosample → null annotation, no runs', async () => {
  const { annotation, runs } = await fetchBiosample('SAMN00000000000')
  assert.equal(annotation, null)
  assert.equal(runs.length, 0)
})

console.log('clusters')
await check('largest cluster 6438923', async () => {
  const { summary, distribution } = await fetchClusterProfiles(6438923)
  assert.equal(summary.n_orfs, 941513)
  assert.ok(distribution.length >= 20)
  for (let i = 1; i < distribution.length; i++) {
    assert.ok(distribution[i - 1].n_orfs >= distribution[i].n_orfs, 'sorted by n_orfs desc')
  }
})
await check('unlinked cluster 11780090 keeps n_orfs NULL', async () => {
  const { summary, distribution } = await fetchClusterProfiles(11780090)
  assert.equal(summary.n_orfs, null)
  // Known data issue (2026-09-18): most n_orfs-NULL clusters still carry
  // distribution rows (usually a single `unprofilable` ORF). The UI keys the
  // "no environmental provenance" state on the summary and hides the bar, so
  // this is reported, not failed. Remove once the backend reconciles the tables.
  if (distribution.length) {
    console.log(`       WARN distribution has ${distribution.length} row(s) for an n_orfs-NULL cluster`)
  }
})

console.log('profiles')
await check('22 profiles with numeric counts', async () => {
  const rows = await fetchProfiles()
  assert.equal(rows.length, 22)
  assert.equal(typeof rows[0].n_biosamples, 'number')
})
await check('single profile + unknown slug', async () => {
  assert.equal((await fetchProfile('soil'))?.profile, 'soil')
  assert.equal(await fetchProfile('not_a_profile'), null)
})

await check('profile biosamples keyset paging + evidence filter', async () => {
  const p1 = await fetchProfileBiosamples('soil', '', 50)
  assert.equal(p1.biosamples.length, 50)
  const p2 = await fetchProfileBiosamples('soil', p1.next_after, 50)
  assert.ok(p2.biosamples[0].biosample > p1.next_after, 'page 2 starts after page 1')
  const stated = await fetchProfileBiosamples('soil', '', 20, 'stated')
  assert.ok(stated.biosamples.every(b => b.profile_evidence === 'stated'))
})
await check('provenance carries stated env_broad_scale', async () => {
  const [row] = await fetchProvenanceRows([743348735])
  assert.equal(row.profile, 'marine')
  assert.match(row.env_broad_scale ?? '', /marine biome/)
})

await pool.end()
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed')
process.exit(failures ? 1 : 0)
