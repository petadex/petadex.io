import * as React from "react"
import { useEffect, useState } from "react"

import Layout from "../components/layout"
import Seo from "../components/seo"
import SequenceTemplate from "../templates/sequence"

const NotFoundPage = () => {
  const [isSequencePage, setIsSequencePage] = useState(false)
  const [accession, setAccession] = useState(null)

  useEffect(() => {
    // Check if this is a sequence page that wasn't built at build time
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      const match = path.match(/^\/sequence\/([^/]+)\/?$/)

      if (match) {
        setIsSequencePage(true)
        setAccession(match[1])
      }
    }
  }, [])

  // If this is a sequence page, render the template with client-side data fetching
  if (isSequencePage && accession) {
    return <SequenceTemplate pageContext={{ sequence: null }} />
  }

  // Otherwise, show the standard 404 page
  return (
    <Layout>
      <h1>404: Not Found</h1>
      <p>You just hit a route that doesn&#39;t exist... the sadness.</p>
    </Layout>
  )
}

export const Head = () => <Seo title="404: Not Found. 404 Page" />

export default NotFoundPage