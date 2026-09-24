/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/
 */

const webpack = require("webpack")

/**
 * Configure webpack for Molstar and feature-viewer (expects global jQuery).
 * @type {import('gatsby').GatsbyNode['onCreateWebpackConfig']}
 */
exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      fallback: {
        fs: false,
        path: false,
        crypto: false,
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery",
        "window.jQuery": "jquery",
      }),
    ],
  })
}

/**
 * Warn (or fail in strict mode) when in-text reference numbers do not increase top-to-bottom.
 * Set VALIDATE_CATH_REFS=strict to fail the build.
 * @type {import('gatsby').GatsbyNode['onPreBuild']}
 */
exports.onPreBuild = () => {
  const { CATH_DOMAIN_CATALOG } = require("./src/data/cathDomainCatalog")
  const { auditCathReferenceOrder } = require("./src/utils/cathReferencePlan")

  /** @type {{ id: string, pfamAccession: string, violations: string[] }[]} */
  const failures = []

  for (const domain of CATH_DOMAIN_CATALOG) {
    const { ok, violations } = auditCathReferenceOrder(domain)
    if (!ok) failures.push({ id: domain.id, pfamAccession: domain.pfamAccession, violations })
  }

  if (!failures.length) return

  console.warn("\n⚠️  CATH profiles with out-of-order in-text citations (top → bottom):")
  for (const { id, pfamAccession, violations } of failures) {
    console.warn(`  • ${id} (${pfamAccession})`)
    for (const v of violations) console.warn(`      ${v}`)
  }
  console.warn(
    "    Fix by reordering URLs in narrative text or the references list. Citation order follows page reading order (overview → sections → inline figure captions).\n",
  )

  if (process.env.VALIDATE_CATH_REFS === "strict") {
    throw new Error(`${failures.length} CATH profile(s) have out-of-order citations`)
  }
}

/**
 * @type {import('gatsby').GatsbyNode['createPages']}
 */
exports.createPages = async ({ actions }) => {
  const { createPage } = actions;

  // Use production URL during build; skip static page generation in local dev
  const apiUrl = process.env.GATSBY_API_URL || "https://api.petadex.net/api";
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    console.log("ℹ️  Skipping static page generation in development mode.");
    return;
  }

  // Create sequence pages
  try {
    const response = await fetch(`${apiUrl}/fastaa`, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const sequences = await response.json();

    sequences.forEach(sequence => {
      createPage({
        path: `/sequence/${sequence.accession}`,
        component: require.resolve("./src/templates/sequence.js"),
        context: { sequence },
      });
    });

  } catch (error) {
    console.error("❌ Error creating sequence pages:", error.message);
  }

  // No enzyme pages are prebuilt here. Enzymes live at /enzyme/:enzymeId, served
  // client-side by src/pages/enzyme/[enzymeId].js. Prebuilding them under
  // /sequence/:genbankAccession collided with curated accessions and replaced
  // their pages (and plate data) with the enzyme template.

  // Create family pages
  try {
    const response = await fetch(`${apiUrl}/enzymes/families/summary?limit=10000`, {
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();
    const families = result.data || [];

    families.forEach(family => {
      createPage({
        path: `/family/${family.family_id}`,
        component: require.resolve("./src/templates/family.js"),
        context: {
          familyId: family.family_id,
        },
      });
    });

  } catch (error) {
    console.error("❌ Error creating family pages:", error.message);
  }
};
