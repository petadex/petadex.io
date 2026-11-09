/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-config/
 */

/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  siteMetadata: {
    title: 'PETadex',
    description: 'The Planetary-scale Pan-Genomic Atlas of Plastic-degrading Enzymes: 298.7 million protein sequences from Logan, NCBI nr and the Plasticome, with sequence search, clusters, BioSample metadata and assay data.',
    author: '@ababaian',
    siteUrl: 'https://petadex.net/',
  },
  plugins: [
    'gatsby-plugin-postcss',
    'gatsby-plugin-sass',
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'PETadex',
        short_name: 'PETadex',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#c94141',
        display: 'minimal-ui',
        icon: 'src/images/petadex-A-512.png', // This path is relative to the root of the site.
      },
    },
  ],
}
