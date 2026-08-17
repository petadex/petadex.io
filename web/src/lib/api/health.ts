import { env } from "@/lib/env"
import { apiFetch } from "./client"
import type { HealthResponse } from "./types"

export type HealthProbe =
  { ok: true; status: HealthResponse["status"] } | { ok: false; reason: string }

/**
 * Probes the backend's `/health` route, which runs `SELECT 1` against RDS.
 *
 * Unlike every other call in `lib/api`, this one swallows its error and reports
 * it as data. It exists so the local-development page can tell you *why* nothing
 * loads. Data pages must let `apiFetch` throw.
 *
 * `/health` lives at the Express root rather than under `/api`, hence
 * `env.apiOrigin`.
 */
export async function probeApiHealth(): Promise<HealthProbe> {
  try {
    const body = await apiFetch<HealthResponse>("/health", {
      baseUrl: env.apiOrigin,
      cache: "no-store",
      timeoutMs: 5_000,
    })
    return { ok: true, status: body.status }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}
