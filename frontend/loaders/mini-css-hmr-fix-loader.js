/**
 * Guard mini-css-extract-plugin CSS HMR when the old <link> was already removed
 * from the DOM (dev-only race; see webpack/mini-css-extract-plugin#682).
 */
module.exports = function miniCssHmrFixLoader(source) {
  return source.replace(
    /el\.parentNode\.removeChild\(el\);/g,
    "if (el.parentNode) { el.parentNode.removeChild(el); }",
  )
}
