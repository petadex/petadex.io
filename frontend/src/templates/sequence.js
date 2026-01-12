// frontend/src/templates/sequence.js
import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import "../styles/home.css";
import SiteHeader from "../components/SiteHeader";
import DataViewer from "../components/DataViewer";
import SynthesizedGenePanel from "../components/SynthesizedGenePanel";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";

export default function SequenceTemplate({ pageContext }) {
  useScrollHeader();
  const [sequence, setSequence] = useState(pageContext.sequence || null);
  const [geneMetadata, setGeneMetadata] = useState([]);
  const [headerData, setHeaderData] = useState(null);
  const [plateData, setPlateData] = useState({});
  const [summaryStats, setSummaryStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loading, setLoading] = useState(!pageContext.sequence);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we already have data from pageContext, don't fetch
    if (pageContext.sequence) {
      return;
    }

    // Otherwise, get accession from URL and fetch from API
    const path = window.location.pathname;
    const match = path.match(/\/sequence\/([^/]+)/);
    
    if (!match) {
      setError("Invalid sequence URL");
      setLoading(false);
      return;
    }

    const accession = match[1];

    async function fetchSequence() {
      try {
        const res = await fetch(`${config.apiUrl}/fastaa/${accession}`);
        if (!res.ok) throw new Error(`Sequence not found: ${accession}`);
        const data = await res.json();
        setSequence(data);
      } catch (err) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }

    fetchSequence();
  }, [pageContext.sequence]);

  // Fetch gene metadata and header data
  useEffect(() => {
    if (!sequence?.accession) return;

    const accession = sequence.accession;

    async function fetchData() {
      try {
        // Fetch gene metadata (existing)
        const metadataRes = await fetch(`${config.apiUrl}/gene-metadata/by-accession/${accession}`);
        if (metadataRes.ok) {
          const data = await metadataRes.json();
          setGeneMetadata(Array.isArray(data) ? data : [data]);
        }

        // Fetch header data for quick stats
        const headerRes = await fetch(`${config.apiUrl}/gene-details/${accession}/header`);
        if (headerRes.ok) {
          const data = await headerRes.json();
          setHeaderData(data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    }

    fetchData();
  }, [sequence?.accession]);

  // Fetch summary statistics
  useEffect(() => {
    if (!sequence?.accession) return;

    const accession = sequence.accession;

    async function fetchSummaryStats() {
      try {
        setStatsLoading(true);
        const response = await fetch(`${config.apiUrl}/aa-seq-features/${accession}`);

        if (!response.ok) {
          throw new Error('Features not found');
        }

        const data = await response.json();

        // Calculate statistics from the arrays
        const calculatedStats = calculateStats(data);
        setSummaryStats(calculatedStats);
      } catch (err) {
        console.error('Error fetching summary stats:', err);
        setSummaryStats(null);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchSummaryStats();
  }, [sequence?.accession]);

  // Fetch plate data when geneMetadata changes
  useEffect(() => {
    if (!geneMetadata || geneMetadata.length === 0) return;

    async function fetchPlateData() {
      const dataPromises = geneMetadata.map(async (gene) => {
        if (!gene.gene) return null;

        try {
          const res = await fetch(`${config.apiUrl}/plate-data/gene/${gene.gene}/average`);
          if (res.ok) {
            const data = await res.json();
            return { geneId: gene.gene, data };
          }
        } catch (err) {
          console.error(`Error fetching plate data for ${gene.gene}:`, err);
        }
        return null;
      });

      const results = await Promise.all(dataPromises);
      const dataMap = {};
      results.forEach(result => {
        if (result) {
          dataMap[result.geneId] = result.data;
        }
      });
      setPlateData(dataMap);
    }

    fetchPlateData();
  }, [geneMetadata]);

  const calculateStats = (data) => {
    const { mass, pi, hpath, sequence_length } = data;
    
    // Total mass: sum of all residue masses
    const totalMass = mass ? mass.reduce((sum, val) => sum + val, 0) : 0;
    
    // Average pI: mean of all pI values
    const avgPI = pi && pi.length > 0 
      ? pi.reduce((sum, val) => sum + val, 0) / pi.length 
      : 0;
    
    // % Hydrophobic residues: count residues with hpath > threshold (e.g., 0.5)
    const hydrophobicCount = hpath 
      ? hpath.filter(val => val > 0.5).length 
      : 0;
    const percentHydrophobic = sequence_length > 0 
      ? (hydrophobicCount / sequence_length) * 100 
      : 0;

    return {
      totalMass: totalMass.toFixed(2),
      avgPI: avgPI.toFixed(2),
      percentHydrophobic: percentHydrophobic.toFixed(1),
      sequenceLength: sequence_length
    };
  };

  if (loading) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        color: "#666"
      }}>
        Loading sequence...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        color: "#dc2626"
      }}>
        Error: {error}
      </div>
    );
  }

  if (!sequence) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        color: "#666"
      }}>
        Sequence not found
      </div>
    );
  }

  return (
    <>
      <SiteHeader currentPage="sequence-detail" />

      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem"
      }}>
        <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ 
          fontSize: "2.5rem",
          marginBottom: "0.5rem",
          color: "#2c3e50"
        }}>
          <a 
            href={`https://www.ncbi.nlm.nih.gov/protein/${sequence.accession}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#2c3e50",
              textDecoration: "none",
              borderBottom: "2px solid #3b82f6"
            }}
          >
            {sequence.accession}
          </a>
        </h1>
        
        {headerData && (
          <div style={{
            display: "flex",
            gap: "1.5rem",
            color: "#6b7280",
            fontSize: "0.95rem",
            marginTop: "1rem"
          }}>
            {headerData.origin_country && (
              <span>Origin: <strong>{headerData.origin_country}</strong></span>
            )}
            {headerData.temperature && (
              <span>Temperature: <strong>{headerData.temperature}°C</strong></span>
            )}
          </div>
        )}
        
        <p style={{
          color: "#6b7280",
          fontSize: "1rem",
          marginTop: "0.5rem"
        }}>
          Plastic-degrading enzyme sequence
        </p>
        </div>

      <SynthesizedGenePanel 
        geneMetadata={geneMetadata} 
        plateData={plateData}
      />

      <DataViewer 
        sequence={sequence.sequence}
        accession={sequence.accession}
        metadata={sequence}
        summaryStats={summaryStats}
        statsLoading={statsLoading}
      />

      <footer style={{
        marginTop: "3rem",
        textAlign: "center",
        color: "#666",
        fontSize: "0.9rem"
      }}>
        © {new Date().getFullYear()} PETadex.io
      </footer>
      </div>
    </>
  );
}