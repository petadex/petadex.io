// /metadata was a standalone copy of the Halo Assay Origins tab. Kept only as a
// redirect so old links still land somewhere; GitHub Pages can't do server-side
// redirects, so this navigates on the client.
import React, { useEffect } from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"

const TARGET = "/halo-assay?tab=origins"

const MetadataRedirect = () => {
  useEffect(() => {
    navigate(TARGET, { replace: true })
  }, [])

  return (
    <section className="py-16 md:py-20 text-center">
      <p className="text-secondary-foreground">
        Sample metadata has moved to{" "}
        <Link to={TARGET}>Halo Assay → Origins</Link>.
      </p>
    </section>
  )
}

export default MetadataRedirect

export const Head = () => (
  <>
    <Seo title="Sample Metadata" />
    <meta name="robots" content="noindex" />
  </>
)
