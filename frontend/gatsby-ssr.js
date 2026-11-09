import React from 'react'
import { ThemeProvider } from './src/context/ThemeContext'
import Layout from './src/components/layout'

export const onRenderBody = ({ setPreBodyComponents }) => {
  setPreBodyComponents([
    <script
      key="theme-init"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var saved = localStorage.getItem('theme');
            if (saved === 'light') document.documentElement.classList.add('light');
          })();
        `
      }}
    />
  ])
}

export const wrapRootElement = ({ element }) => (
  <ThemeProvider>{element}</ThemeProvider>
)

// GitHub Pages has no rewrites, so every client-only route (/sequence/:id, /cluster/:level/:id, /biosample/:id, ...)
// is answered with 404.html and the client router then renders the matching page. If 404.html carried the 404 page's
// markup, React would hydrate it against a different page (errors #418/#423) and visitors would briefly see "404".
// An empty body makes Gatsby do a plain client render instead (production-app.js: empty focus wrapper -> render).
// A genuinely unknown path still shows the 404 page once the client router has run.
const isNotFoundShell = props =>
  /^\/404(\.html|\/)?$/.test(props?.location?.pathname || props?.path || "")

export const wrapPageElement = ({ element, props }) =>
  isNotFoundShell(props) ? null : <Layout {...props}>{element}</Layout>
