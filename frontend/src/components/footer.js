import React from "react"
import { Link } from "gatsby"

const Footer = () => {
  return (
    <footer className="bg-primary-foreground py-6 text-sm text-primary">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* COPYRIGHT */}
          <p className="text-muted-foreground">
            <small>&copy; {new Date().getFullYear()} PETadex</small>
          </p>

          {/* MENU */}
          <nav role="navigation" className="flex flex-wrap items-center gap-4 text-primary">
            <Link
              to="/fastaa"
              aria-label="Database"
              className="text-primary hover:text-accent-hover transition-colors duration-150"
            >
              <small>Database</small>
            </Link>
            <Link
              to="/cath-domains"
              aria-label="CATH domains"
              className="text-primary hover:text-accent-hover transition-colors duration-150"
            >
              <small>CATH domains</small>
            </Link>
            <a
              href="https://github.com/ababaian/petadex.io"
              aria-label="GitHub"
              className="text-primary hover:text-accent-hover transition-colors duration-150"
            >
              <small>GitHub</small>
            </a>
            <a
              href="https://github.com/ababaian/petadex.io#contributing"
              aria-label="Contribute"
              className="text-primary hover:text-accent-hover transition-colors duration-150"
            >
              <small>Contribute</small>
            </a>
          </nav>

          {/* SOCIAL */}
          <nav role="navigation" className="flex shrink-0 items-center gap-2">
            <a
              href="https://github.com/ababaian/petadex.io"
              aria-label="GitHub"
              className="text-primary hover:text-accent-hover transition-colors duration-150"
            >
              <svg
                viewBox="0 0 24 24"
                height="16"
                width="16"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                role="img"
                aria-label="GitHub"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default Footer;
