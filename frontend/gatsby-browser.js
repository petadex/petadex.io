import React from 'react'
import { ThemeProvider } from './src/context/ThemeContext'
import Layout from './src/components/layout'
import './src/styles/global.css';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';

export const wrapRootElement = ({ element }) => (
  <ThemeProvider>{element}</ThemeProvider>
)

export const wrapPageElement = ({ element, props }) => (
  <Layout {...props}>{element}</Layout>
)

/** Recover from stale webpack chunks / HMR after `gatsby develop` restarts. */
export const onClientEntry = () => {
  const reloadOnce = () => {
    const key = "gatsby-chunk-reload"
    if (sessionStorage.getItem(key)) return false
    sessionStorage.setItem(key, "1")
    window.location.reload()
    return true
  }

  const shouldReloadForDevAssetError = (/** @type {unknown} */ reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : ""
    const stack = reason instanceof Error ? reason.stack || "" : ""

    if (/Loading chunk .+ failed/i.test(message)) return true

    // Webpack HMR / chunk timeout after a long-running or restarted develop server.
    if (
      /timeout:\s*https?:\/\/localhost:\d+\/component---/i.test(message) ||
      /Loading chunk .+ failed/i.test(stack)
    ) {
      return true
    }

    if (
      /Failed to fetch/i.test(message) &&
      (/webpack/i.test(message) || /hot-update|hmr|__webpack/i.test(stack))
    ) {
      return true
    }

    return false
  }

  window.addEventListener("unhandledrejection", event => {
    if (shouldReloadForDevAssetError(event.reason)) {
      reloadOnce()
    }
  })

  window.addEventListener("error", event => {
    if (shouldReloadForDevAssetError(event.error || event.message)) {
      reloadOnce()
    }
  })
}
