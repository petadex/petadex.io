import React, { useEffect, useRef, useState } from "react";
import config from "../config";
import "../styles/molstar-custom.css";

const ProteinViewer = ({
  accession,
  width = "100%",
  height = "100%",
  showControls = true,
  initialStyle = "cartoon",
  enableMeasurement = true,
  enableSelection = true
}) => {
  const containerRef = useRef(null);
  const pluginRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accession || typeof window === 'undefined') return;

    let plugin = null;
    let isMounted = true;

    const loadMolstarAndStructure = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading Molstar for:', accession);

        // Import Molstar CSS first
        await import('molstar/lib/mol-plugin-ui/skin/light.scss');

        // Import Molstar modules with React 18 renderer
        const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
        const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18');
        const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec');

        if (!isMounted || !containerRef.current) {
          console.log('Component unmounted, aborting');
          return;
        }

        console.log('Molstar loaded, creating plugin...');

        // Ensure container has explicit pixel dimensions
        const rect = containerRef.current.getBoundingClientRect();
        console.log('Container dimensions:', rect.width, rect.height);

        if (rect.width === 0 || rect.height === 0) {
          throw new Error('Container has no dimensions');
        }

        containerRef.current.style.width = `${rect.width}px`;
        containerRef.current.style.height = `${rect.height}px`;

        // Create plugin with React 18 renderer
        // Configure spec based on whether we want controls
        const spec = DefaultPluginUISpec();
        if (!showControls) {
          // For small viewers, disable all UI panels
          spec.layout = {
            initial: {
              isExpanded: false,
              showControls: false,
              controlsDisplay: 'none'
            }
          };
          spec.components = {
            ...spec.components,
            controls: { left: 'none', right: 'none', top: 'none', bottom: 'none' }
          };
        }

        plugin = await createPluginUI({
          target: containerRef.current,
          spec: spec,
          render: renderReact18,
        });

        pluginRef.current = plugin;
        console.log('Plugin created:', plugin);

        // Get PDB info from backend
        const pdbUrl = `${config.apiUrl}/pdb/accession/${accession}`;
        console.log('Fetching PDB info from:', pdbUrl);

        const response = await fetch(pdbUrl);

        if (!response.ok) {
          throw new Error('No structure available');
        }

        const pdbInfo = await response.json();
        console.log('PDB info received:', pdbInfo);

        if (!isMounted) {
          console.log('Component unmounted, aborting');
          return;
        }

        // Fetch PDB file
        console.log('Fetching PDB file from:', pdbInfo.pdb_url);
        const pdbResponse = await fetch(pdbInfo.pdb_url);
        if (!pdbResponse.ok) {
          throw new Error(`Failed to load PDB file: ${pdbResponse.status}`);
        }

        const pdbData = await pdbResponse.text();
        console.log('PDB data loaded, length:', pdbData.length);

        if (!isMounted) return;

        // Load structure into Molstar
        console.log('Loading structure into Molstar...');
        const data = await plugin.builders.data.rawData({
          data: pdbData,
          label: `${accession} Structure`
        });

        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        // Apply representation based on initialStyle
        let reprParams = {};
        switch(initialStyle) {
          case 'cartoon':
            reprParams = {
              type: 'cartoon',
              typeParams: {},
              color: 'sequence-id',
              colorParams: {}
            };
            break;
          case 'surface':
            reprParams = {
              type: 'molecular-surface',
              typeParams: {},
              color: 'hydrophobicity',
              colorParams: {}
            };
            break;
          case 'ball-and-stick':
            reprParams = {
              type: 'ball-and-stick',
              typeParams: {},
              color: 'element-symbol',
              colorParams: {}
            };
            break;
          default:
            reprParams = {
              type: 'cartoon',
              typeParams: {},
              color: 'sequence-id',
              colorParams: {}
            };
        }

        const representation = await plugin.builders.structure.representation.addRepresentation(structure, reprParams);

        // Auto-focus on structure
        const { Structure } = await import('molstar/lib/mol-model/structure');
        const loci = Structure.toStructureElementLoci(structure.cell.obj.data);
        await plugin.managers.camera.focusLoci(loci);

        // Enable measurement tools if requested
        if (enableMeasurement && plugin.managers.structure.measurement) {
          console.log('Enabling measurement tools');
          // Measurement tools are available through the UI when controls are shown
        }

        // Enable selection tools if requested
        if (enableSelection && plugin.managers.structure.selection) {
          console.log('Enabling selection tools');
          // Selection is enabled by default in Molstar
        }

        console.log('Structure loaded successfully');
        setLoading(false);
      } catch (err) {
        console.error('Error loading structure:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadMolstarAndStructure();

    return () => {
      isMounted = false;
      if (pluginRef.current) {
        console.log('Disposing plugin');
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
    };
  }, [accession, showControls, initialStyle, enableMeasurement, enableSelection]);

  // Hide header when hovering over structure viewer (only when controls are shown - i.e., on detail pages)
  const handleMouseEnter = () => {
    if (!showControls) return; // Don't hide header for small preview viewers

    const header = document.querySelector('.ui-section-header');
    if (header && window.pageYOffset > 100) {
      header.classList.add('header-hidden');
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      className={!showControls ? 'molstar-compact' : ''}
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        isolation: 'isolate' // Create stacking context to contain Molstar UI
      }}
    >
      {/* Molstar plugin container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden' // Ensure nothing escapes
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
            fontSize: '0.875rem',
            zIndex: 10
          }}
        >
          Loading structure...
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
            fontSize: '0.75rem',
            textAlign: 'center',
            padding: '0.5rem',
            zIndex: 10
          }}
        >
          Structure unavailable
        </div>
      )}
    </div>
  );
};

export default ProteinViewer;
