import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import "../styles/home.css";
import SiteHeader from "../components/SiteHeader";
import SequenceViewer from "../components/SequenceViewer";
import Seo from "../components/seo";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";

export default function EnzymeTemplate({ pageContext }) {
  useScrollHeader();
  const [enzyme, setEnzyme] = useState(pageContext.enzyme || null);
  const [loading, setLoading] = useState(!pageContext.enzyme);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pageContext.enzyme) {
      return;
    }

    const path = window.location.pathname;
    const match = path.match(/\/enzyme\/([^/]+)/);

    if (!match) {
      setError("Invalid enzyme URL");
      setLoading(false);
      return;
    }

    const enzymeId = match[1];

    async function fetchEnzyme() {
      try {
        const res = await fetch(`${config.apiUrl}/enzymes/${enzymeId}`);
        if (!res.ok) throw new Error(`Enzyme not found: ${enzymeId}`);
        const data = await res.json();
        setEnzyme(data);
      } catch (err) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }

    fetchEnzyme();
  }, [pageContext.enzyme]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        Loading enzyme...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#dc2626" }}>
        Error: {error}
      </div>
    );
  }

  if (!enzyme) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        Enzyme not found
      </div>
    );
  }

  const enzymeName = enzyme.genbank_accession_id || `Enzyme ${enzyme.enzyme_id}`;

  return (
    <>
      <SiteHeader currentPage="enzymes" />

      <main style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "10rem"
      }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link
            to="/enzymes"
            style={{
              color: "#3b82f6",
              textDecoration: "none",
              fontSize: "0.9rem"
            }}
          >
            &larr; Back to Enzymes
          </Link>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2.5rem",
            marginBottom: "0.5rem",
            color: "#2c3e50",
            fontFamily: "monospace"
          }}>
            {enzyme.genbank_accession_id ? (
              <a
                href={`https://www.ncbi.nlm.nih.gov/protein/${enzyme.genbank_accession_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2c3e50",
                  textDecoration: "none",
                  borderBottom: "2px solid #3b82f6"
                }}
              >
                {enzyme.genbank_accession_id}
              </a>
            ) : (
              `Enzyme ${enzyme.enzyme_id}`
            )}
          </h1>

          <div style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            marginTop: '1rem'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              <strong>ID:</strong> {enzyme.enzyme_id}
            </span>
            {enzyme.family !== null && (
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                <strong>Family:</strong> {enzyme.family}
                {enzyme.family_pid === null && (
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.15rem 0.4rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    CENTROID
                  </span>
                )}
                {enzyme.family_pid !== null && (
                  <span style={{ marginLeft: '0.25rem', color: '#94a3b8' }}>
                    ({enzyme.family_pid}% identity)
                  </span>
                )}
              </span>
            )}
            {enzyme.component !== null && (
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                <strong>Component:</strong> {enzyme.component}
              </span>
            )}
            {enzyme.variant !== null && (
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                <strong>Variant:</strong> {enzyme.variant}
              </span>
            )}
          </div>

          <p style={{
            color: "#6b7280",
            fontSize: "1rem",
            marginTop: "1rem"
          }}>
            Plastic-degrading enzyme from BLAST-NR database
          </p>
        </div>

        {enzyme.translated_sequence && (
          <div style={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "1.5rem",
            backgroundColor: "white",
            boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)"
          }}>
            <h2 style={{
              fontSize: "1.25rem",
              marginBottom: "1rem",
              color: "#2c3e50"
            }}>
              Amino Acid Sequence
            </h2>
            <SequenceViewer
              aminoAcidSequence={enzyme.translated_sequence}
              nucleotideSequence={null}
            />
          </div>
        )}

        <footer style={{
          marginTop: "3rem",
          textAlign: "center",
          color: "#666",
          fontSize: "0.9rem"
        }}>
          &copy; {new Date().getFullYear()} PETadex.io
        </footer>
      </main>
    </>
  );
}

export const Head = ({ pageContext }) => {
  const enzyme = pageContext?.enzyme;
  const enzymeName = enzyme?.genbank_accession_id || `Enzyme ${enzyme?.enzyme_id || ""}`;
  return (
    <Seo
      title={enzymeName}
      description={`View details for plastic-degrading enzyme ${enzymeName} including sequence data and classification.`}
    />
  );
};
