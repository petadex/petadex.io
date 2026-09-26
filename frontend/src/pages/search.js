import React from "react"
import SequenceSearch from "../components/search/SequenceSearch"
import Container from "../components/common/Container"
import Seo from "../components/seo"

const SearchPage = () => {
  return (
    <>
      <section className="py-20 md:py-24">
        <Container>
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">Sequence Search</h1>
          <p className="mt-4 text-lg text-secondary-foreground">
            Find similar plastic-degrading enzymes by searching ~307M sequences in the Logan corpus with DIAMOND
          </p>
          <SequenceSearch />
        </Container>
      </section>

      <section className="py-20 md:py-24 bg-surface-raised">
        <Container>
          <h2>About the Search</h2>
          <p className="">
            This tool uses{" "}
            <a
              href="https://github.com/bbuchfink/diamond"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline underline-offset-2"
            >
              DIAMOND
            </a>{" "}
            to search your query sequence against the{" "}
            <a
              href="https://github.com/IndexThePlanet/Logan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline underline-offset-2"
            >
              Logan
            </a>{" "}
            corpus (~307M protein sequences assembled from the SRA). The search identifies
            proteins with similar sequences, which may share functional properties.
          </p>

          <h3 className="text-base font-semibold text-primary mb-2 mt-6">
            Understanding Results
          </h3>
          <ul className="space-y-2 text-sm text-secondary-foreground">
            <li>
              <strong className="text-primary">Identity:</strong> Percentage of identical amino
              acids in the alignment
            </li>
            <li>
              <strong className="text-primary">E-value:</strong> Expected number of false
              positives; lower is more significant
            </li>
            <li>
              <strong className="text-primary">Coverage:</strong> Percentage of your query
              sequence that aligned
            </li>
          </ul>
        </Container>
      </section>
    </>
  )
}

export default SearchPage

export const Head = () => (
  <Seo
    title="Sequence Search"
    description="Search for similar plastic-degrading enzymes using protein sequence similarity"
  />
)
