import * as React from "react"
import Seo from "../components/seo"

const NotFoundPage = () => (
  <section className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 py-20">
    <h1 className="text-5xl font-bold text-accent mb-4">404</h1>
    <p className="text-secondary-foreground text-lg">
      You just hit a route that doesn&#39;t exist... the sadness.
    </p>
  </section>
)

export const Head = () => <Seo title="404: Not Found" />

export default NotFoundPage
