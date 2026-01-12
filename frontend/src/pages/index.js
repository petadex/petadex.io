import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import "../styles/home.css";
import { useScrollHeader } from "../hooks/useScrollHeader";
import SiteHeader from "../components/SiteHeader";
import SequencePanel from "../components/SequencePanel";
import StructurePanel from "../components/StructurePanel";
import MetadataPanel from "../components/MetadataPanel";
import config from "../config";

export default function HomePage() {
  useScrollHeader();
  const ISPETASE_ACCESSION = "WP_054022242.1";

  const [sequenceData, setSequenceData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIsPETaseData() {
      try {
        // Fetch sequence data
        const seqRes = await fetch(`${config.apiUrl}/fastaa/${ISPETASE_ACCESSION}`);
        if (seqRes.ok) {
          const seqData = await seqRes.json();
          setSequenceData(seqData);
        }

        // Fetch metadata
        const metaRes = await fetch(`${config.apiUrl}/gene-metadata/by-accession/${ISPETASE_ACCESSION}`);
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          setMetadata(Array.isArray(metaData) ? metaData : [metaData]);
        }

        // Fetch summary stats
        const statsRes = await fetch(`${config.apiUrl}/aa-seq-features/${ISPETASE_ACCESSION}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setSummaryStats(statsData);
        }
      } catch (err) {
        console.error('Error fetching IsPETase data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIsPETaseData();
  }, []);

  return (
    <>
      <SiteHeader currentPage="home" />

      <main role="main">
        {/* HERO SECTION */}
        <section className="ui-section-hero">
          <div className="ui-layout-container">
            <div className="ui-layout-column-6 ui-layout-column-center">
              <h1>Explore plastic-degrading enzymes.</h1>
              <p className="ui-text-intro">
                PETadex is an open-source platform for discovering and analyzing plastic-degrading enzymes (PETases).
                Search sequences, view 3D structures, and explore experimental data for enzymes that break down plastics.
              </p>
              {/* CTA */}
              <div className="ui-component-cta ui-layout-flex">
                <Link
                  to="/fastaa"
                  role="link"
                  aria-label="Start exploring"
                  className="ui-component-button ui-component-button-normal ui-component-button-primary"
                >
                  Start Exploring &mdash; It's Free
                </Link>
                <p className="ui-text-note"><small>Open-source and community-driven.</small></p>
              </div>
            </div>
            {/* IMAGE */}
            <img
              src={require('../images/cys-pilot-seqs.png').default}
              loading="lazy"
              alt="PETase Network Diagram"
              className="ui-section-hero--image"
            />
          </div>
        </section>

        {/* CUSTOMER / PARTNERS SECTION */}
        <section className="ui-section-customer">
          <div className="ui-layout-container">
            <div className="ui-section-customer__layout ui-layout-flex">
              <p className="ui-text-note" style={{margin: 'auto', textAlign: 'center', width: '100%'}}>
                <small>Powered by open science and community contributions</small>
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="ui-section-feature">
          <div className="ui-layout-container">
            {/* Feature 1 */}
            <div className="ui-section-feature__layout ui-layout-grid ui-layout-grid-2">
              <div className="ui-image-half-left" style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                padding: "1rem",
                maxHeight: "400px",
                overflow: "auto",
                width: "100%"
              }}>
                {loading ? (
                  <p style={{ textAlign: "center", color: "#666" }}>Loading preview...</p>
                ) : (
                  <SequencePanel
                    sequence={sequenceData?.sequence}
                    accession={ISPETASE_ACCESSION}
                    summaryStats={summaryStats}
                    statsLoading={false}
                  />
                )}
              </div>
              <div>
                <h2>Comprehensive Sequence Database</h2>
                <p className="ui-text-intro">
                  Access a curated collection of plastic-degrading enzyme sequences with detailed metadata,
                  experimental data, and provenance information from research worldwide.
                </p>
                <ul className="ui-component-list ui-component-list-feature ui-layout-grid">
                  <li className="ui-component-list--item ui-component-list--item-check">
                    350+ PETase sequences
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Experimental activity data
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Geographic metadata
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Regular updates
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="ui-section-feature__layout ui-layout-grid ui-layout-grid-2">
              <div>
                <h2>3D Structure Visualization</h2>
                <p className="ui-text-intro">
                  Explore protein structures in your browser with interactive 3D visualization.
                  View PDB structures, analyze binding sites, and understand enzyme mechanisms.
                </p>
                <ul className="ui-component-list ui-component-list-feature ui-layout-grid">
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Interactive 3D viewer
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    PDB structure data
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Structural annotations
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Browser-based rendering
                  </li>
                </ul>
              </div>
              <div className="ui-image-half-right" style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                overflow: "hidden",
                width: "100%",
                height: "500px"
              }}>
                {loading ? (
                  <p style={{ textAlign: "center", color: "#666", paddingTop: "2rem" }}>Loading preview...</p>
                ) : (
                  <StructurePanel accession={ISPETASE_ACCESSION} />
                )}
              </div>
            </div>

            {/* Feature 3 */}
            <div className="ui-section-feature__layout ui-layout-grid ui-layout-grid-2">
              <div className="ui-image-half-left" style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                padding: "1rem",
                maxHeight: "400px",
                overflow: "auto",
                width: "100%"
              }}>
                {loading ? (
                  <p style={{ textAlign: "center", color: "#666" }}>Loading preview...</p>
                ) : (
                  <MetadataPanel
                    metadata={metadata}
                    accession={ISPETASE_ACCESSION}
                  />
                )}
              </div>
              <div>
                <h2>Experimental Data & Analytics</h2>
                <p className="ui-text-intro">
                  Access experimental measurements, plate reader data, and enzyme activity profiles.
                  Compare performance across conditions and identify promising candidates.
                </p>
                <ul className="ui-component-list ui-component-list-feature ui-layout-grid">
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Activity measurements
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Environmental parameters
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Data visualization
                  </li>
                  <li className="ui-component-list--item ui-component-list--item-check">
                    Export capabilities
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL / USE CASES SECTION */}
        <section className="ui-section-testimonial">
          <div className="ui-layout-container">
            <div className="ui-layout-column-6 ui-layout-column-center">
              <h2>Use Cases</h2>
              <p className="ui-text-intro">How researchers use PETadex</p>
            </div>
            <div className="ui-section-testimonial__layout ui-layout-grid ui-layout-grid-3">
              <div className="ui-layout-column-4">
                <svg viewBox="0 0 24 24" height="48" width="48" fill="none" stroke="#353535" strokeWidth="1.5" style={{marginBottom: '1rem'}}>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <p className="ui-section-testimonial--quote ui-text-intro">
                  "Find novel enzyme variants with specific activity profiles for bioengineering applications."
                </p>
                <p className="ui-section-testimonial--author">
                  <strong>Protein Engineering</strong><br/>
                  <small className="ui-text-note">Discover new variants</small>
                </p>
              </div>

              <div className="ui-layout-column-4">
                <svg viewBox="0 0 24 24" height="48" width="48" fill="none" stroke="#353535" strokeWidth="1.5" style={{marginBottom: '1rem'}}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <p className="ui-section-testimonial--quote ui-text-intro">
                  "Explore the geographic distribution of plastic-degrading enzymes and discover patterns in enzyme evolution."
                </p>
                <p className="ui-section-testimonial--author">
                  <strong>Environmental Research</strong><br/>
                  <small className="ui-text-note">Study enzyme distribution</small>
                </p>
              </div>

              <div className="ui-layout-column-4">
                <svg viewBox="0 0 24 24" height="48" width="48" fill="none" stroke="#353535" strokeWidth="1.5" style={{marginBottom: '1rem'}}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <p className="ui-section-testimonial--quote ui-text-intro">
                  "Access comprehensive datasets for computational modeling and machine learning applications."
                </p>
                <p className="ui-section-testimonial--author">
                  <strong>Computational Biology</strong><br/>
                  <small className="ui-text-note">Build predictive models</small>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CLOSING CTA SECTION */}
        <section className="ui-section-close">
          <div className="ui-layout-container">
            <div className="ui-layout-column-6 ui-layout-column-center">
              <h2>Start exploring today.</h2>
              <p className="ui-text-intro">Join the community tackling plastic pollution through enzyme research.</p>
              {/* CTA */}
              <div className="ui-component-cta ui-layout-flex">
                <Link
                  to="/fastaa"
                  role="link"
                  aria-label="Browse database"
                  className="ui-component-button ui-component-button-normal ui-component-button-primary"
                >
                  Browse Database &mdash; It's Free
                </Link>
                <p className="ui-text-note"><small>Open source and always free.</small></p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer role="contentinfo" className="ui-section-footer">
        <div className="ui-layout-container">
          <div className="ui-section-footer__layout ui-layout-flex">
            {/* COPYRIGHT */}
            <p className="ui-section-footer--copyright ui-text-note">
              <small>&copy; {new Date().getFullYear()} PETadex</small>
            </p>
            {/* MENU */}
            <nav role="navigation" className="ui-section-footer--nav ui-section-footer--menu ui-layout-flex">
              <Link to="/fastaa" role="link" aria-label="Database" className="ui-text-note">
                <small>Database</small>
              </Link>
              <a href="https://github.com/ababaian/petadex.io" role="link" aria-label="GitHub" className="ui-text-note">
                <small>GitHub</small>
              </a>
              <a href="https://github.com/ababaian/petadex.io#contributing" role="link" aria-label="Contribute" className="ui-text-note">
                <small>Contribute</small>
              </a>
            </nav>
            {/* SOCIAL */}
            <nav role="navigation" className="ui-section-footer--nav ui-section-footer--social ui-layout-flex">
              <a href="https://github.com/ababaian/petadex.io" role="link" aria-label="GitHub">
                <svg viewBox="0 0 24 24" height="16" width="16" fill="none" stroke="#AEAEAE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" role="img" aria-label="GitHub">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
