/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/
 */

/**
 * Configure webpack for Molstar
 * @type {import('gatsby').GatsbyNode['onCreateWebpackConfig']}
 */
exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      fallback: {
        fs: false,
        path: false,
        crypto: false,
      }
    }
  });
};

/**
 * @type {import('gatsby').GatsbyNode['createPages']}
 */
exports.createPages = async ({ actions }) => {
  const { createPage } = actions;
  const apiUrl = process.env.GATSBY_API_URL || "http://localhost:3001";

  // Create sequence pages
  try {
    const response = await fetch(`${apiUrl}/api/fastaa`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.warn(`API returned status ${response.status}, skipping individual sequence page generation`);
      console.log("Sequence pages will be rendered client-side on demand");
    } else {
      const sequences = await response.json();

      sequences.forEach(sequence => {
        createPage({
          path: `/sequence/${sequence.accession}`,
          component: require.resolve("./src/templates/sequence.js"),
          context: { sequence },
        });
      });

      console.log(`Created ${sequences.length} individual sequence pages`);
    }
  } catch (error) {
    console.warn("Error creating individual sequence pages (backend unavailable during build):", error.message);
    console.log("Sequence pages will be rendered client-side on demand");
  }

  // Create enzyme pages
  try {
    const response = await fetch(`${apiUrl}/api/enzymes?limit=10000`, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.warn(`API returned status ${response.status}, skipping individual enzyme page generation`);
      console.log("Enzyme pages will be rendered client-side on demand");
    } else {
      const result = await response.json();
      const enzymes = result.data || [];

      enzymes.forEach(enzyme => {
        createPage({
          path: `/enzyme/${enzyme.enzyme_id}`,
          component: require.resolve("./src/templates/enzyme.js"),
          context: { enzyme },
        });
      });

      console.log(`Created ${enzymes.length} individual enzyme pages`);
    }
  } catch (error) {
    console.warn("Error creating individual enzyme pages (backend unavailable during build):", error.message);
    console.log("Enzyme pages will be rendered client-side on demand");
  }
};