import React, { useEffect, useRef, useState } from "react";
import config from "../config";

/**
 * Lightweight 3D protein viewer using 3Dmol.js
 * Used for carousel previews - lighter weight than Molstar
 */
const Protein3DMolViewer = ({
  accession,
  width = "120px",
  height = "120px",
  backgroundColor = "#ffffff"
}) => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accession || typeof window === 'undefined') return;

    let viewer = null;
    let isMounted = true;

    const load3DMol = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load 3Dmol.js library dynamically
        if (!window.$3Dmol) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.4.0/3Dmol-min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (!isMounted || !containerRef.current) return;

        // Get PDB info from backend
        const pdbUrl = `${config.apiUrl}/pdb/accession/${accession}`;
        const response = await fetch(pdbUrl);

        if (!response.ok) {
          throw new Error('No structure available');
        }

        const pdbInfo = await response.json();

        if (!isMounted) return;

        // Fetch PDB file
        const pdbResponse = await fetch(pdbInfo.pdb_url);
        if (!pdbResponse.ok) {
          throw new Error('Failed to load PDB file');
        }

        const pdbData = await pdbResponse.text();

        if (!isMounted || !containerRef.current) return;

        // Create 3Dmol viewer
        viewer = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: backgroundColor,
          antialias: true,
        });

        viewerRef.current = viewer;

        // Load structure
        viewer.addModel(pdbData, 'pdb');

        // Style: cartoon representation with color scheme
        viewer.setStyle({}, {
          cartoon: {
            color: 'spectrum',
            opacity: 0.9
          }
        });

        // Center and zoom (increased by 50%)
        viewer.zoomTo();
        viewer.zoom(1.2); // 0.8 * 1.5 = 1.2
        viewer.render();

        // Enable rotation animation
        viewer.rotate(1, 'y');
        let rotationInterval = setInterval(() => {
          if (viewerRef.current && isMounted) {
            viewer.rotate(1, 'y');
          }
        }, 50);

        // Store interval for cleanup
        viewer._rotationInterval = rotationInterval;

        setLoading(false);
      } catch (err) {
        console.error('Error loading 3Dmol structure:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    load3DMol();

    return () => {
      isMounted = false;
      if (viewerRef.current) {
        // Stop rotation
        if (viewerRef.current._rotationInterval) {
          clearInterval(viewerRef.current._rotationInterval);
        }
        viewerRef.current = null;
      }
    };
  }, [accession, backgroundColor]);

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0'
      }}
    >
      {/* 3Dmol.js container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            fontSize: '0.75rem',
            zIndex: 10
          }}
        >
          Loading...
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            color: '#94a3b8',
            fontSize: '0.65rem',
            textAlign: 'center',
            padding: '0.5rem',
            zIndex: 10
          }}
        >
          No structure
        </div>
      )}
    </div>
  );
};

export default Protein3DMolViewer;
