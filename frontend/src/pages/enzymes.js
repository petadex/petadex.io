import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import "../styles/home.css";
import SiteHeader from "../components/SiteHeader";
import SequenceViewer from "../components/SequenceViewer";
import Seo from "../components/seo";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";

const EnzymesPage = () => {
  useScrollHeader();
  const [enzymes, setEnzymes] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterHasComponent, setFilterHasComponent] = useState("all");
  const [visibleCount, setVisibleCount] = useState(50);

  const LOAD_MORE_INCREMENT = 50;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load statistics
        const statsRes = await fetch(`${config.apiUrl}/enzymes/stats/overview`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Load enzymes with pagination
        let url = `${config.apiUrl}/enzymes?limit=1000`;
        if (filterHasComponent !== "all") {
          url += `&has_component=${filterHasComponent}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setEnzymes(data.data || []);
      } catch (err) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filterHasComponent]);

  // Reset visible count when search or filter changes
  useEffect(() => {
    setVisibleCount(50);
  }, [searchInput, filterHasComponent]);

  // Filter enzymes based on search input
  const filteredEnzymes = searchInput
    ? enzymes.filter(enzyme =>
        enzyme.genbank_accession_id?.toLowerCase().includes(searchInput.toLowerCase()) ||
        enzyme.enzyme_id?.toString().includes(searchInput)
      )
    : enzymes;

  const visibleEnzymes = filteredEnzymes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEnzymes.length;

  return (
    <>
      <Seo title="BLAST-NR Enzyme Sequences" description="Browse plastic-degrading enzyme sequences from BLAST-NR database" />
      <SiteHeader currentPage="enzymes" />

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
          }}>BLAST-NR Enzyme Database</h1>
          <p style={{
            color: "#666",
            fontSize: "1.1rem",
            marginBottom: "1.5rem"
          }}>
            Browse plastic-degrading enzyme sequences from BLAST-NR clustering
          </p>

          {/* Statistics */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Enzymes</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>{parseInt(stats.total_enzymes).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Families</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>{parseInt(stats.total_families).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Components</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>{parseInt(stats.total_components).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Centroids</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>{parseInt(stats.family_centroids).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Variants</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>{parseInt(stats.total_variants).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Search and filter controls */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by accession or enzyme ID..."
              style={{
                padding: "0.75rem",
                fontSize: "1rem",
                flex: "1",
                minWidth: "300px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                outline: "none"
              }}
            />
            <select
              value={filterHasComponent}
              onChange={(e) => setFilterHasComponent(e.target.value)}
              style={{
                padding: "0.75rem",
                fontSize: "1rem",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                outline: "none",
                backgroundColor: "white"
              }}
            >
              <option value="all">All Sequences</option>
              <option value="true">With Component</option>
              <option value="false">Without Component</option>
            </select>
          </div>

          <p style={{
            color: "#666",
            marginTop: "1rem",
            fontSize: "0.9rem"
          }}>
            {loading ? (
              <span style={{ fontStyle: "italic" }}>Loading enzyme data...</span>
            ) : error ? (
              <span style={{ color: "#dc2626" }}>Error loading enzymes</span>
            ) : searchInput || filterHasComponent !== "all" ? (
              `Found ${filteredEnzymes.length} matching sequence${filteredEnzymes.length !== 1 ? 's' : ''}`
            ) : (
              `Showing ${visibleEnzymes.length} of ${enzymes.length} sequences`
            )}
          </p>
        </div>

        {!loading && filteredEnzymes.length === 0 && (searchInput || filterHasComponent !== "all") && (
          <div style={{
            padding: "2rem",
            textAlign: "center",
            color: "#666",
            backgroundColor: "#f8fafc",
            borderRadius: "8px"
          }}>
            No sequences found matching your criteria
          </div>
        )}

        {/* Enzyme list */}
        <div>
          {visibleEnzymes.map((enzyme) => (
            <div
              key={enzyme.enzyme_id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "1.5rem",
                marginBottom: "1rem",
                backgroundColor: "white",
                boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{
                    margin: "0 0 0.5rem 0",
                    color: "#2c3e50",
                    fontSize: "1.25rem",
                    fontFamily: "monospace"
                  }}>
                    {enzyme.genbank_accession_id || `Enzyme ${enzyme.enzyme_id}`}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      <strong>ID:</strong> {enzyme.enzyme_id}
                    </span>
                    {enzyme.family !== null && (
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
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
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        <strong>Component:</strong> {enzyme.component}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {enzyme.translated_sequence && (
                <SequenceViewer
                  aminoAcidSequence={enzyme.translated_sequence}
                  nucleotideSequence={null}
                />
              )}
            </div>
          ))}
        </div>

        {/* Load more button */}
        {hasMore && !loading && (
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
              Load {Math.min(LOAD_MORE_INCREMENT, filteredEnzymes.length - visibleCount)} More
            </button>
            <button
              onClick={() => setVisibleCount(filteredEnzymes.length)}
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
              Show All ({filteredEnzymes.length})
            </button>
          </div>
        )}
      </main>
    </>
  );
};

export default EnzymesPage;
