// /enzymes was the family/enzyme browser. It has been replaced by /explore, and is kept only as a redirect so
// old links and bookmarks still land somewhere; GitHub Pages can't do server-side redirects, so this navigates
// on the client.
import React, { useEffect } from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"

const TARGET = "/explore"

const EnzymesRedirect = () => {
  useEffect(() => {
    navigate(TARGET, { replace: true })
  }, [])

  return (
    <section className="py-16 md:py-20 text-center">
      <p className="text-secondary-foreground">
        The enzyme browser has moved to <Link to={TARGET}>Explore</Link>.
      </p>
    </section>
  )
}

export default EnzymesRedirect

export const Head = () => (
  <>
    <Seo title="Enzymes" />
    <meta name="robots" content="noindex" />
  </>
)
