/**
 * Relays for two orchestrator actions that read a finished search's stored
 * artefacts. Neither touches the database.
 *
 * POST /api/search/samples  {ids, limit?}
 *   Found in Samples for a whole search's Logan hits at once (the batch form of
 *   GET /api/sequence/:id/samples). Backs the Environments tab's sample detail
 *   and the hits table's sample keywords.
 *   Response (orchestrator body, passed through):
 *     { status, limit,
 *       results:     { [id]: { status: ok|not_found|not_applicable,
 *                              n_biosamples, n_bioprojects,
 *                              samples: [[biosample, n_runs, ka_max]] } },
 *       biosamples:  { [biosample]: { bioproject, profile, profile_evidence,
 *                      isolation_source, env_broad_scale, env_medium, host,
 *                      country, latitude, longitude, temperature_c, ph,
 *                      top_species: [[name, share]], keywords: [...] } },
 *       bioprojects: { [bioproject]: title } }
 *   200 · 400 malformed (validated here, or the orchestrator's 400, e.g. a
 *   response over 5 MB) · 503 lookup unavailable.
 *
 * POST /api/search/align  {sessionId, jobId?, ids?, poll?}
 *   The alignment + tree the aggregator builds after every search (FAMSA, then
 *   FastTree), or a custom one over up to 200 of that result's hits.
 *   Response: { status: none|running|ready|failed, session_id, job_id, key,
 *     started_at, n_sequences, ... }; when ready also afa, newick, ids,
 *     n_columns, timing, database_version, search_version; failed has error.
 *   200 any status · 400 bad ids · 404 no such result · 503 not configured or
 *   unavailable. Never cached: the status moves.
 */

import { Router } from 'express';
import Joi from 'joi';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SEARCH_LAMBDA_NAME =
  process.env.SEARCH_LAMBDA_NAME ||
  process.env.MMSEQS2_LAMBDA_NAME ||
  'petadex-diamond-orchestrator';

const BATCH_MAX = 500;
const ALIGN_MAX = 200;

const samplesSchema = Joi.object({
  ids: Joi.array()
    .items(Joi.string().pattern(/^LG\d{1,15}$/))
    .min(1)
    .max(BATCH_MAX)
    .unique()
    .required(),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const alignSchema = Joi.object({
  // A search sessionId: an MD5, a Lambda job UUID, or a regen_example_* slug.
  sessionId: Joi.string().pattern(/^[A-Za-z0-9_-]{1,128}$/).required(),
  jobId: Joi.string().pattern(/^[A-Za-z0-9_-]{1,128}$/),
  ids: Joi.array()
    .items(Joi.string().pattern(/^(PL|NR|LG)\d{1,15}$/))
    .min(1)
    .max(ALIGN_MAX)
    .unique(),
  poll: Joi.boolean(),
});

let lambdaClient = null;
function getLambdaClient() {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({
      region: AWS_REGION,
      // A whole-search samples batch takes seconds in-region and over 10 s
      // from outside AWS, so allow up to 25 s (under API Gateway's 29 s) and
      // no SDK retry: a retry of a slow call would only double the wait.
      maxAttempts: 1,
      requestHandler: { requestTimeout: 25000 },
    });
  }
  return lambdaClient;
}

/** Invokes the orchestrator with `payload`; resolves to its parsed envelope. */
export async function invokeAction(payload) {
  const resp = await getLambdaClient().send(new InvokeCommand({
    FunctionName: SEARCH_LAMBDA_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  }));
  if (resp.FunctionError) {
    throw new Error(`${payload.action} action returned FunctionError: ${resp.FunctionError}`);
  }
  return resp.Payload ? JSON.parse(Buffer.from(resp.Payload).toString('utf8')) : {};
}

/**
 * { statusCode, body } from an orchestrator envelope. Handled errors arrive as
 * statusCode >= 400 rather than a FunctionError; `body` is an object or an
 * API-Gateway-style JSON string.
 */
export function parseEnvelope(envelope) {
  const statusCode = typeof envelope?.statusCode === 'number' ? envelope.statusCode : 200;
  let body = envelope?.body !== undefined ? envelope.body : envelope;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = { error: body };
    }
  }
  return { statusCode, body };
}

const validationError = error => ({ error: error.details[0].message });

export function createSearchSamplesRouter({ invoke = invokeAction } = {}) {
  const router = Router();

  router.post('/', async (req, res) => {
    const { error, value } = samplesSchema.validate(req.body ?? {});
    if (error) return res.status(400).json(validationError(error));

    let envelope;
    try {
      envelope = await invoke({ action: 'samples', ids: value.ids, limit: value.limit });
    } catch (err) {
      console.error('batch samples lookup failed:', err.message);
      return res.status(503).json({ error: 'Sample lookup unavailable.' });
    }

    const { statusCode, body } = parseEnvelope(envelope);
    if (statusCode === 400) {
      return res.status(400).json({ error: body?.error || 'Bad sample lookup request.' });
    }
    if (statusCode >= 400) {
      return res.status(503).json({ error: 'Sample lookup unavailable.', upstream_status: statusCode });
    }
    // A batch must answer with per-id results; anything else is a store bug.
    if (!body || typeof body.results !== 'object' || typeof body.biosamples !== 'object') {
      return res.status(503).json({ error: 'Sample lookup returned an unexpected response.' });
    }
    // Same store, same freshness as the single-id lookup.
    res.set('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(body);
  });

  return router;
}

export function createSearchAlignRouter({ invoke = invokeAction } = {}) {
  const router = Router();

  router.post('/', async (req, res) => {
    const { error, value } = alignSchema.validate(req.body ?? {});
    if (error) return res.status(400).json(validationError(error));
    res.set('Cache-Control', 'no-store');

    let envelope;
    try {
      envelope = await invoke({ action: 'align', ...value });
    } catch (err) {
      console.error(`align lookup failed for ${value.sessionId}:`, err.message);
      return res.status(503).json({ status: 'unavailable', error: 'Alignment unavailable.' });
    }

    const { statusCode, body } = parseEnvelope(envelope);
    if (statusCode === 400 || statusCode === 404) {
      return res.status(statusCode).json(body ?? { error: 'Alignment request failed.' });
    }
    if (statusCode >= 400) {
      return res.status(503).json({
        status: 'unavailable',
        error: body?.error || 'Alignment unavailable.',
        upstream_status: statusCode,
      });
    }
    if (!body || typeof body.status !== 'string') {
      return res.status(503).json({ status: 'unavailable', error: 'Alignment returned an unexpected response.' });
    }
    return res.status(200).json(body);
  });

  return router;
}

export const searchSamplesRoutes = createSearchSamplesRouter();
export const searchAlignRoutes = createSearchAlignRouter();
