import React, { useState } from "react"
import { Link } from "gatsby"
import SequenceViewer from "./SequenceViewer"
import LazyPetadexCatalyticDomainsPanel from "../petadexDomains/LazyPetadexCatalyticDomainsPanel.jsx"

const INITIAL_VISIBLE_COUNT = 10
const LOAD_MORE_INCREMENT = 20

function SequenceList({ title, sequenceList }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  // Only one row mounts the (heavy) feature-viewer at a time, on demand.
  const [openDomains, setOpenDomains] = useState(
    /** @type {string | null} */ (null)
  )
  const visibleSequences = sequenceList.slice(0, visibleCount)
  const hasMore = visibleCount < sequenceList.length

  // Generate unique ID for aria-controls
  const panelId = `sequence-list-${title.replace(/\s+/g, "-").toLowerCase()}`

  return (
    <section className="mb-8">
      <details
        id={panelId}
        open={false} // Sync with pagination state
        className="group"
      >
        <summary
          className={`
            flex items-center justify-between gap-3 cursor-pointer select-none list-none w-full
            text-xl font-semibold text-primary py-3 border-b
            hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ring-inset
            marker:hidden
            ${visibleCount > 0 ? "mb-4" : "mb-0"}
          `}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span
              className="text-sm text-muted-foreground transition-transform duration-200 shrink-0 group-open:rotate-90"
              aria-hidden="true"
            >
              ▶
            </span>
            <span className="truncate">{title}</span>
          </div>

          <span className="text-sm font-normal text-muted-foreground ml-auto shrink-0">
            ({sequenceList.length} sequence
            {sequenceList.length !== 1 ? "s" : ""})
          </span>
        </summary>

        <div className="animate-in slide-in-from-top-2 duration-200 mt-2">
          {sequenceList.length === 0 ? (
            <p className="text-muted-foreground py-6 px-4">
              No sequences in this category
            </p>
          ) : (
            <>
              <ul className="space-y-3 list-none p-0">
                {visibleSequences.map(seq => {
                  const domainsOpen = openDomains === seq.accession
                  return (
                    <li
                      key={seq.accession}
                      className="card hover:shadow-md transition-shadow p-4"
                    >
                      <Link
                        to={`/sequence/${seq.accession}`}
                        className="block no-underline text-primary"
                      >
                        <h3 className="font-mono text-base font-semibold text-accent mb-2">
                          {seq.accession}
                        </h3>
                        <SequenceViewer
                          aminoAcidSequence={seq.sequence}
                          header={seq.accession}
                          nucleotideSequence={null}
                        />
                        {(seq.source || seq.synonyms) && (
                          <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
                            {seq.source && (
                              <p>
                                <strong className="font-medium text-primary">
                                  Source:
                                </strong>{" "}
                                {seq.source}
                              </p>
                            )}
                            {seq.synonyms && (
                              <p>
                                <strong className="font-medium text-primary">
                                  Synonyms:
                                </strong>{" "}
                                {seq.synonyms}
                              </p>
                            )}
                          </div>
                        )}
                      </Link>

                      <div className="mt-3 border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDomains(domainsOpen ? null : seq.accession)
                          }
                          className="text-accent text-sm hover:text-accent-hover bg-transparent border-none cursor-pointer p-0 inline-flex items-center gap-1.5"
                          aria-expanded={domainsOpen}
                        >
                          <span
                            className={`transition-transform duration-200 ${
                              domainsOpen ? "rotate-90" : ""
                            }`}
                            aria-hidden="true"
                          >
                            ▶
                          </span>
                          {domainsOpen
                            ? "Hide catalytic domains"
                            : "Show catalytic domains"}
                        </button>
                        {domainsOpen && (
                          <div className="mt-3">
                            <LazyPetadexCatalyticDomainsPanel
                              accession={seq.accession}
                              sequence={seq.sequence}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {hasMore && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6 p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl">
                  <button
                    className="btn btn-secondary flex-1 sm:flex-none"
                    onClick={() =>
                      setVisibleCount(visibleCount + LOAD_MORE_INCREMENT)
                    }
                  >
                    Load{" "}
                    {Math.min(
                      LOAD_MORE_INCREMENT,
                      sequenceList.length - visibleCount
                    )}{" "}
                    More
                  </button>
                  <button
                    className="btn btn-ghost text-muted-foreground flex-1 sm:flex-none"
                    onClick={() => setVisibleCount(sequenceList.length)}
                  >
                    Show All ({sequenceList.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </details>
    </section>
  )
}

export default SequenceList
