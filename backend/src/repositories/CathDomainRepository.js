import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSchemaFlags } from '../schemaFlags.js';
import { getPublicReadS3Client, streamToString } from '../lib/s3Public.js';
import {
  ATLAS_COMPONENTS_FROM_BASE_TABLES,
  ATLAS_COMPONENTS_FROM_FAMILY_ATLAS,
  DOMAIN_ROLLUP_STATS,
  PLATE_ACTIVITY_FOR_CATH_DOMAIN,
  UMAP_POINTS_FROM_BASE_TABLES,
  UMAP_POINTS_FROM_FAMILY_ATLAS,
  ALL_CATH_DOMAINS,
} from '../atlasQueries.js';
import { getSequenceDiversity } from '../lib/sequenceDiversityCache.js';
import { getKnownFunctions } from '../lib/knownFunctionsCache.js';

const TEXT_BUCKET = process.env.RESULTS_BUCKET || 'petadex';

/**
 * Data access for the `/api/atlas` routes: SQL selection, execution, and row-shaping. The two
 * slow-query caches (sequenceDiversityCache.js, knownFunctionsCache.js) stay separate modules;
 * this proxies to them.
 */
export class CathDomainRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  /** All UMAP points: from `family_atlas` when present, else built from base tables. */
  async getUmapPoints() {
    const flags = await getSchemaFlags(this.pool);
    const sql = flags.familyAtlas ? UMAP_POINTS_FROM_FAMILY_ATLAS : UMAP_POINTS_FROM_BASE_TABLES;
    const { rows } = await this.pool.query(sql);
    return rows;
  }

  /** Distinct atlas components with representative CATH/domain labels and family counts. */
  async getComponents() {
    const flags = await getSchemaFlags(this.pool);
    const sql = flags.familyAtlas
      ? ATLAS_COMPONENTS_FROM_FAMILY_ATLAS
      : ATLAS_COMPONENTS_FROM_BASE_TABLES;
    const { rows } = await this.pool.query(sql);
    return rows;
  }

  /** In-house BHET halo-assay activity per gene for a CATH domain, normalized vs each plate's EV. */
  async getPlateActivity(cathId) {
    const { rows } = await this.pool.query(PLATE_ACTIVITY_FOR_CATH_DOMAIN, [cathId]);
    return rows.map(r => ({
      gene: r.gene,
      nPlates: r.n_plates,
      nWells: r.n_wells,
      meanDeltaVsEv: r.mean_delta_vs_ev == null ? null : Number(r.mean_delta_vs_ev),
    }));
  }

  /** Predicted-structure and named-species rollup counts for a CATH domain's overview card. */
  async getDomainStats(cathId) {
    const { rows } = await this.pool.query(DOMAIN_ROLLUP_STATS, [cathId]);
    const row = rows[0] || {};
    return {
      uniquePdbs: Number(row.unique_pdbs) || 0,
      namedSpecies: Number(row.named_species) || 0,
    };
  }

  /** Distinct-cluster counts at 30/60/90% identity for a CATH domain; cached (see class comment). */
  async getSequenceDiversity(cathId) {
    return getSequenceDiversity(cathId);
  }

  /** Top documented GenBank functions for a CATH domain's enzymes; cached (see class comment). */
  async getKnownFunctions(cathId) {
    return getKnownFunctions(cathId);
  }

  /** Every `cath_domain` currently assigned to at least one enzyme. */
  async getAllCathDomainIds() {
    const { rows } = await this.pool.query(ALL_CATH_DOMAINS);
    return rows.map(r => r.cath_domain).filter(Boolean);
  }

  /**
   * Long-form catalog prose (overview / functionalDiversity / interactingDomains) for a
   * `cathId`, read from the public `petadex` bucket at `cath-domains/{cathId}/text.json` (same
   * pattern as `routes/family.js`'s phylo-tree fetch). Returns `null`, not an error, when the
   * object doesn't exist yet.
   */
  async getDomainText(cathId) {
    const key = `cath-domains/${cathId}/text.json`;
    const client = getPublicReadS3Client();
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: TEXT_BUCKET, Key: key }));
      const content = await streamToString(response.Body);
      return JSON.parse(content);
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }
}
