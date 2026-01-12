import * as React from "react"
import { Link } from "gatsby"

const Header = ({ siteTitle }) => (
  <header
    style={{
      margin: `0 auto`,
      padding: `var(--space-4) var(--size-gutter)`,
      display: `flex`,
      alignItems: `center`,
      justifyContent: `space-between`,
    }}
  >
    <Link
      to="/"
      style={{
        fontSize: `var(--font-sm)`,
        textDecoration: `none`,
      }}
    >
      {siteTitle}
    </Link>
    <nav
      style={{
        display: `flex`,
        alignItems: `center`,
        gap: `var(--space-4)`,
      }}
    >
      <Link
        to="/sequence"
        style={{
          fontSize: `var(--font-sm)`,
          textDecoration: `none`,
          color: `inherit`,
        }}
        activeStyle={{
          fontWeight: `bold`,
        }}
      >
        Sequence
      </Link>
      <Link
        to="/substrate"
        style={{
          fontSize: `var(--font-sm)`,
          textDecoration: `none`,
          color: `inherit`,
        }}
        activeStyle={{
          fontWeight: `bold`,
        }}
      >
        Substrate
      </Link>
      <Link
        to="/metadata"
        style={{
          fontSize: `var(--font-sm)`,
          textDecoration: `none`,
          color: `inherit`,
        }}
        activeStyle={{
          fontWeight: `bold`,
        }}
      >
        Metadata
      </Link>
    </nav>
  </header>
)

export default Header
