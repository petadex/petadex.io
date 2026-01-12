import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import "../styles/home.css";
import SiteHeader from "../components/SiteHeader";
import SequenceViewer from "../components/SequenceViewer";
import FeaturedPETases from "../components/FeaturedPETases";
import Seo from "../components/seo";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";

const FastaaPage = () => {
  useScrollHeader();
  const [sequences, setSequences] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withMetadataOpen, setWithMetadataOpen] = useState(false);
  const [withoutMetadataOpen, setWithoutMetadataOpen] = useState(false);
  const [withMetadataVisibleCount, setWithMetadataVisibleCount] = useState(10);
  const [withoutMetadataVisibleCount, setWithoutMetadataVisibleCount] = useState(10);

  const INITIAL_VISIBLE_COUNT = 10;
  const LOAD_MORE_INCREMENT = 20;

  const endpoint = `${config.apiUrl}/fastaa`;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setSequences(data);
      } catch (err) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [endpoint]);

  // Reset visible counts when search changes
  useEffect(() => {
    setWithMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
    setWithoutMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [searchInput]);

  // Reset visible counts when sections are closed
  useEffect(() => {
    if (!withMetadataOpen) {
      setWithMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
    }
  }, [withMetadataOpen]);

  useEffect(() => {
    if (!withoutMetadataOpen) {
      setWithoutMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
    }
  }, [withoutMetadataOpen]);

  // Filter sequences based on search input
  const filteredSequences = searchInput
    ? sequences.filter(seq =>
        seq.accession.toLowerCase().includes(searchInput.toLowerCase())
      )
    : sequences;

  // Segregate sequences by in_gene_metadata
  const sequencesWithMetadata = filteredSequences.filter(seq => seq.in_gene_metadata === true);
  const sequencesWithoutMetadata = filteredSequences.filter(seq => seq.in_gene_metadata !== true);

  // Render a sequence list section
  const renderSequenceSection = (title, sequenceList, sectionKey, isOpen, toggleOpen, visibleCount, setVisibleCount) => {
    const visibleSequences = sequenceList.slice(0, visibleCount);
    const hasMore = visibleCount < sequenceList.length;

    return (
      <section key={sectionKey} style={{ marginBottom: "2rem" }}>
        <h2
          onClick={toggleOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleOpen();
            }
          }}
          role="button"
          tabIndex={0}
          style={{
            fontSize: "1.3rem",
            marginBottom: isOpen ? "1rem" : "0",
            color: "#2c3e50",
            paddingBottom: "0.75rem",
            borderBottom: "2px solid #e2e8f0",
            cursor: "pointer",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#1a202c"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#2c3e50"}
        >
          <span style={{
            marginRight: "0.5rem",
            fontSize: "1.1rem",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-block"
          }}>
            ▶
          </span>
          {title}
          <span style={{
            fontSize: "1rem",
            color: "#666",
            fontWeight: "normal",
            marginLeft: "0.75rem"
          }}>
            {loading ? (
              <span style={{ fontStyle: "italic" }}>Loading...</span>
            ) : (
              `(${sequenceList.length} sequence${sequenceList.length !== 1 ? 's' : ''})`
            )}
          </span>
        </h2>
        <div style={{
          display: isOpen ? "block" : "none"
        }}>
          {loading ? (
            <div style={{
              padding: "2rem",
              textAlign: "center",
              color: "#666",
              fontSize: "1rem"
            }}>
              Loading sequences...
            </div>
          ) : error ? (
            <div style={{
              padding: "2rem",
              textAlign: "center",
              color: "#dc2626",
              fontSize: "1rem"
            }}>
              Error loading sequences: {error}
            </div>
          ) : sequenceList.length === 0 ? (
            <div style={{
              padding: "2rem",
              textAlign: "center",
              color: "#666",
              fontSize: "1rem"
            }}>
              No sequences in this category
            </div>
          ) : (
            <>
              <ul style={{
                listStyle: "none",
                padding: 0
              }}>
                {visibleSequences.map((seq) => (
                  <li
                    key={seq.accession}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "1.5rem",
                      marginBottom: "1rem",
                      backgroundColor: "white",
                      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
                      transition: "box-shadow 0.2s"
                    }}
                  >
                    <Link
                      to={`/sequence/${seq.accession}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block"
                      }}
                    >
                      <h3 style={{
                        margin: "0 0 1rem 0",
                        color: "#2c3e50",
                        fontSize: "1.5rem"
                      }}>
                      {seq.accession}
                      </h3>
                      <SequenceViewer
                        aminoAcidSequence={seq.sequence}
                        nucleotideSequence={null}
                      />

                      {/* Additional metadata if available */}
                      {(seq.source || seq.synonyms) && (
                        <div style={{
                          marginTop: "1rem",
                          fontSize: "0.9rem",
                          color: "#666"
                        }}>
                          {seq.source && (
                            <p style={{ margin: "0.25rem 0" }}>
                              <strong>Source:</strong> {seq.source}
                            </p>
                          )}
                          {seq.synonyms && (
                            <p style={{ margin: "0.25rem 0" }}>
                              <strong>Synonyms:</strong> {seq.synonyms}
                            </p>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  marginTop: "1.5rem",
                  paddingBottom: "1rem"
                }}>
                  <button
                    onClick={() => setVisibleCount(visibleCount + LOAD_MORE_INCREMENT)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      fontSize: "1rem",
                      color: "#2c3e50",
                      backgroundColor: "white",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontWeight: "500"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.borderColor = "#94a3b8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                  >
                    Load {Math.min(LOAD_MORE_INCREMENT, sequenceList.length - visibleCount)} More
                  </button>
                  <button
                    onClick={() => setVisibleCount(sequenceList.length)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      fontSize: "1rem",
                      color: "#2563eb",
                      backgroundColor: "white",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontWeight: "500"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#eff6ff";
                      e.currentTarget.style.borderColor = "#2563eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                  >
                    Show All ({sequenceList.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  };

  return (
    <>
      <Seo title="Protein Sequences" description="Browse and search plastic-degrading enzyme sequences" />
      <SiteHeader currentPage="sequence" />

      <main style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "10rem"
      }}>
        <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          fontSize: "2.5rem",
          marginBottom: "0.5rem",
          color: "#2c3e50"
        }}>A Database for PETases</h1>
        <p style={{
          color: "#666",
          fontSize: "1.1rem",
          marginBottom: "1.5rem"
        }}>
          Search and browse plastic-degrading enzymes
        </p>

        {/* Search input */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by accession number (e.g., P80146.3)"
          style={{
            padding: "0.75rem",
            fontSize: "1rem",
            width: "100%",
            maxWidth: "500px",
            borderRadius: "4px",
            border: "1px solid #cbd5e1",
            outline: "none"
          }}
        />

        <p style={{
          color: "#666",
          marginTop: "1rem",
          fontSize: "0.9rem"
        }}>
          {loading ? (
            <span style={{ fontStyle: "italic" }}>Loading sequence data...</span>
          ) : error ? (
            <span style={{ color: "#dc2626" }}>Error loading sequences</span>
          ) : searchInput ? (
            `Found ${filteredSequences.length} matching sequence${filteredSequences.length !== 1 ? 's' : ''}`
          ) : (
            `Total sequences: ${sequences.length} (${sequencesWithMetadata.length} with experimental data, ${sequencesWithoutMetadata.length} without)`
          )}
        </p>
        </div>

      {/* Featured PETases - only show when not searching */}
      {!searchInput && (
        <div style={{ marginTop: "-1.5rem" }}>
          <FeaturedPETases sequences={sequences} loading={loading} />
        </div>
      )}

      {!loading && filteredSequences.length === 0 && searchInput && (
        <div style={{
          padding: "1rem",
          textAlign: "center",
          color: "#666",
          backgroundColor: "#f8fafc",
          borderRadius: "1px"
        }}>
          No sequences found matching "{searchInput}"
        </div>
      )}

      {renderSequenceSection(
        "Sequences with Experimental Data",
        sequencesWithMetadata,
        "with-metadata",
        withMetadataOpen,
        () => setWithMetadataOpen(!withMetadataOpen),
        withMetadataVisibleCount,
        setWithMetadataVisibleCount
      )}
      {renderSequenceSection(
        "Sequences without Experimental Data",
        sequencesWithoutMetadata,
        "without-metadata",
        withoutMetadataOpen,
        () => setWithoutMetadataOpen(!withoutMetadataOpen),
        withoutMetadataVisibleCount,
        setWithoutMetadataVisibleCount
      )}
      </main>
    </>
  );
};

export default FastaaPage;