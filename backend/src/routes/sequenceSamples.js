/**
 * GET /api/sequence/:id/samples — the BioSamples a Logan (LG…) sequence was
 * found in. Backs "Found in Samples" on the web/ sequence record.
 *
 * Proxies the search orchestrator's `samples` action, which reads the
 * precomputed v260701 metadata store. The list is too large to attach to every
 * search result, so it is fetched per sequence, on demand.
 *
 * Response (orchestrator body, passed through):
 *   { id, n_biosamples, n_bioprojects, samples: [{ biosample, bioproject,
 *     bioproject_title, n_runs, ka_max, profile, profile_evidence,
 *     isolation_source, env_broad_scale, env_medium, host, country, latitude,
 *     longitude, temperature_c, ph, top_species: [[name, share]] }] }
 *   `samples` is capped (200, by n_runs); `n_biosamples` is the true total.
 *
 * Status mapping:
 *   200  found
 *   400  not a Logan petadex_id (validated here, never invoked)
 *   404  the store has no record for this id
 *   503  lookup unavailable: invoke error/timeout, FunctionError, or any other
 *        orchestrator status, including the action not existing yet on a
 *        deployed orchestrator
 */

import { Router } from 'express';
import Joi from 'joi';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SEARCH_LAMBDA_NAME =
  process.env.SEARCH_LAMBDA_NAME ||
  process.env.MMSEQS2_LAMBDA_NAME ||
  'petadex-diamond-orchestrator';

// Logan only: the store's sample lists describe where an LG sequence was
// assembled from. PL and NR records carry no per-sample list.
const idSchema = Joi.string().pattern(/^LG\d{1,15}$/).required();

let lambdaClient = null;
function getLambdaClient() {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({
      region: AWS_REGION,
      // A read with no side effects, so one SDK retry is safe. Bounded well
      // under API Gateway's 29s so a slow store read fails as a 503, not a 504.
      maxAttempts: 2,
      requestHandler: { requestTimeout: 10000 },
    });
  }
  return lambdaClient;
}

/** Invokes the orchestrator's `samples` action; resolves to its parsed envelope. */
export async function invokeSamplesAction(id) {
  const resp = await getLambdaClient().send(new InvokeCommand({
    FunctionName: SEARCH_LAMBDA_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({ action: 'samples', id }),
  }));
  if (resp.FunctionError) {
    throw new Error(`samples action returned FunctionError: ${resp.FunctionError}`);
  }
  return resp.Payload ? JSON.parse(Buffer.from(resp.Payload).toString('utf8')) : {};
}

/**
 * Maps an orchestrator envelope to { status, body }. The orchestrator returns
 * handled errors as { statusCode >= 400, body } rather than a FunctionError,
 * with `body` either an object or an API-Gateway-style JSON string.
 */
export function samplesResponse(envelope, id) {
  const statusCode = typeof envelope?.statusCode === 'number' ? envelope.statusCode : 200;
  let body = envelope?.body !== undefined ? envelope.body : envelope;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = { error: body };
    }
  }

  if (statusCode === 404) {
    return { status: 404, body: { error: `No sample record for ${id}.` } };
  }
  if (statusCode >= 400) {
    return {
      status: 503,
      body: { error: 'Sample lookup unavailable.', upstream_status: statusCode },
    };
  }
  // A 200 must describe the id asked for; anything else is a store bug, and
  // rendering another sequence's samples would be silently wrong.
  if (!body || body.id !== id || !Array.isArray(body.samples)) {
    return { status: 503, body: { error: 'Sample lookup returned an unexpected response.' } };
  }
  return { status: 200, body };
}

export function createSequenceSamplesRouter({ invoke = invokeSamplesAction } = {}) {
  const router = Router();

  router.get('/:id/samples', async (req, res) => {
    const { error, value: id } = idSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({ error: 'id must be a Logan petadex_id (LG followed by digits).' });
    }

    let envelope;
    try {
      envelope = await invoke(id);
    } catch (err) {
      console.error(`samples lookup failed for ${id}:`, err.message);
      return res.status(503).json({ error: 'Sample lookup unavailable.' });
    }

    const { status, body } = samplesResponse(envelope, id);
    if (status === 200) {
      // The store is versioned per release and rebuilt rarely; an hour of
      // staleness is far below its update frequency.
      res.set('Cache-Control', 'public, max-age=3600');
    }
    return res.status(status).json(body);
  });

  return router;
}

export default createSequenceSamplesRouter();
