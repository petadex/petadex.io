import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import config from "../../config";
import AnnotationResidueCallout from "./AnnotationResidueCallout";
import { computeCalloutLayout } from "./molstarAnnotationCallout";
import {
  attachAnnotationInteractivity,
  attachCameraReproject,
  detachAnnotationInteractivity,
} from "./molstarAnnotationInteractivity";
import "../../styles/molstar-custom.css";

const HOVER_BOX = { w: 220, h: 80 };
const PINNED_BOX = { w: 300, h: 160 };

// Stable empty-array reference for the optional annotation props. Using a shared
// frozen constant (instead of a fresh `[]` default per render) keeps the prop
// identity stable when a caller passes nothing, so the structure-loading effect
// below — which lists `annotations`/`annotationGroups` in its deps — does NOT
// re-fire on every render. Without this, an un-annotated viewer (e.g. the corpus
// sequence page) tears down and re-fetches the Mol* structure in an infinite loop.
const EMPTY_ANNOTATIONS = Object.freeze([]);

const ProteinViewer = ({
  accession,
  /** Optional direct PDB file URL (e.g. RCSB download). Skips /api/pdb lookup. */
  structureUrl = null,
  width = "100%",
  height = "100%",
  showControls = true,
  initialStyle = "cartoon",
  enableMeasurement = true,
  enableSelection = true,
  annotations = EMPTY_ANNOTATIONS,
  annotationGroups = EMPTY_ANNOTATIONS,
  annotationStylePreset = null,
}) => {
  const containerRef = useRef(null);
  const pluginRef = useRef(null);
  const interactivitySubsRef = useRef([]);
  const cameraSubRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverTip, setHoverTip] = useState(null);
  const [pinnedAnnotation, setPinnedAnnotation] = useState(null);
  const [layoutTick, setLayoutTick] = useState(0);

  const bumpLayout = useCallback(() => {
    setLayoutTick(t => t + 1);
  }, []);

  const groupMap = useMemo(
    () => new Map((annotationGroups || []).map(g => [g.id, g])),
    [annotationGroups],
  );

  const hoverLayout = useMemo(() => {
    if (!hoverTip?.worldPos || !pluginRef.current || !containerRef.current) {
      return null;
    }
    return computeCalloutLayout(
      pluginRef.current,
      containerRef.current,
      hoverTip.worldPos,
      HOVER_BOX,
    );
  }, [hoverTip, layoutTick, loading]);

  const pinnedLayout = useMemo(() => {
    if (!pinnedAnnotation?.worldPos || !pluginRef.current || !containerRef.current) {
      return null;
    }
    return computeCalloutLayout(
      pluginRef.current,
      containerRef.current,
      pinnedAnnotation.worldPos,
      PINNED_BOX,
    );
  }, [pinnedAnnotation, layoutTick, loading]);

  useEffect(() => {
    if (!hoverTip && !pinnedAnnotation) {
      if (cameraSubRef.current) {
        cameraSubRef.current.unsubscribe();
        cameraSubRef.current = null;
      }
      return;
    }

    const plugin = pluginRef.current;
    if (!plugin) return;

    if (cameraSubRef.current) {
      cameraSubRef.current.unsubscribe();
    }
    cameraSubRef.current = attachCameraReproject(plugin, bumpLayout);

    return () => {
      if (cameraSubRef.current) {
        cameraSubRef.current.unsubscribe();
        cameraSubRef.current = null;
      }
    };
  }, [hoverTip, pinnedAnnotation, bumpLayout, loading]);

  useEffect(() => {
    if ((!accession && !structureUrl) || typeof window === 'undefined') return;

    let plugin = null;
    let isMounted = true;

    const loadMolstarAndStructure = async () => {
      try {
        setLoading(true);
        setError(null);
        setHoverTip(null);
        setPinnedAnnotation(null);

        const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
        const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18');
        const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec');

        if (!isMounted || !containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
          throw new Error('Container has no dimensions');
        }

        containerRef.current.style.width = `${rect.width}px`;
        containerRef.current.style.height = `${rect.height}px`;

        const spec = DefaultPluginUISpec();
        if (!showControls) {
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

        // Fetch PDB: structureUrl prop, accession as direct URL, or /api/pdb lookup.
        let pdbData;
        let label = accession ? `${accession} Structure` : "Structure";
        const directUrl =
          structureUrl ||
          (accession && String(accession).startsWith("http") ? accession : null);

        if (directUrl) {
          const response = await fetch(directUrl);
          if (!response.ok) {
            throw new Error(`Failed to load PDB from URL: ${response.status}`);
          }
          pdbData = await response.text();
          if (structureUrl && accession) {
            label = `${accession} Structure`;
          } else if (structureUrl) {
            label = "Structure";
          }
        } else {
          const apiUrl = `${config.apiUrl}/pdb/accession/${accession}`;
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error("No structure available");
          }
          const pdbInfo = await response.json();
          if (!isMounted) return;
          const pdbResponse = await fetch(pdbInfo.pdb_url);
          if (!pdbResponse.ok) {
            throw new Error(`Failed to load PDB file: ${pdbResponse.status}`);
          }
          pdbData = await pdbResponse.text();
          label = `${accession} Structure`;
        }

        if (!isMounted) return;

        // Build Mol* structure from the fetched PDB data
        const data = await plugin.builders.data.rawData({
          data: pdbData,
          label,
        });

        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        const cartoonColor =
          annotationStylePreset?.cartoonColor || '#f5f5f5';

        const { Color } = await import('molstar/lib/mol-util/color');
        const cartoonColorValue = Color.fromHexStyle(cartoonColor);

        let reprParams = {};
        switch (initialStyle) {
          case 'cartoon':
            reprParams = {
              type: 'cartoon',
              typeParams: {},
              color: 'uniform',
              colorParams: { value: cartoonColorValue },
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
              color: 'uniform',
              colorParams: { value: cartoonColorValue },
            };
        }

        await plugin.builders.structure.representation.addRepresentation(structure, reprParams);

        if (annotations?.length) {
          const { applyAnnotationRepresentations } = await import('./molstarAnnotations.js');
          await applyAnnotationRepresentations(
            plugin,
            structure,
            annotations,
            annotationStylePreset,
            annotationGroups,
          );
        }

        const { Structure } = await import('molstar/lib/mol-model/structure');
        const loci = Structure.toStructureElementLoci(structure.cell.obj.data);
        await plugin.managers.camera.focusLoci(loci);

        if (isMounted && annotations?.length) {
          detachAnnotationInteractivity(interactivitySubsRef.current);
          interactivitySubsRef.current = attachAnnotationInteractivity(plugin, {
            annotations,
            onHover: payload => {
              if (!isMounted) return;
              if (!payload) {
                setHoverTip(null);
                return;
              }
              setHoverTip({
                annotation: payload.annotation,
                worldPos: payload.worldPos,
              });
              bumpLayout();
            },
            onClick: payload => {
              if (!isMounted) return;
              if (!payload) {
                setPinnedAnnotation(null);
                return;
              }
              setPinnedAnnotation({
                annotation: payload.annotation,
                worldPos: payload.worldPos,
              });
              bumpLayout();
            },
          });
        }

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
      detachAnnotationInteractivity(interactivitySubsRef.current);
      interactivitySubsRef.current = [];
      if (cameraSubRef.current) {
        cameraSubRef.current.unsubscribe();
        cameraSubRef.current = null;
      }
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
    };
  }, [
    accession,
    structureUrl,
    showControls,
    initialStyle,
    enableMeasurement,
    enableSelection,
    annotationStylePreset?.cartoonColor,
    annotations,
    annotationGroups,
    bumpLayout,
  ]);

  const handleMouseEnter = () => {
    if (!showControls) return;

    const header = document.querySelector('.ui-section-header');
    if (header && window.pageYOffset > 100) {
      header.classList.add('header-hidden');
    }
  };

  const handleViewerMouseLeave = () => {
    setHoverTip(null);
  };

  const showHover =
    hoverTip &&
    hoverLayout &&
    (!pinnedAnnotation ||
      pinnedAnnotation.annotation?.seqPos !== hoverTip.annotation?.seqPos);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleViewerMouseLeave}
      className={!showControls ? 'molstar-compact' : ''}
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        isolation: 'isolate'
      }}
    >
      <div
        ref={containerRef}
        className='w-full h-full absolute top-0 left-0 overflow-hidden'
      />

      {loading && (
        <div
          className='w-full h-full absolute top-0 left-0 flex items-center justify-center bg-surface text-primary text-sm z-10'
        >
          Loading structure...
        </div>
      )}

      {error && !loading && (
        <div
          className='w-full h-full absolute top-0 left-0 flex items-center justify-center bg-surface text-primary text-xs z-10 text-center p-2'
        >
          Structure unavailable
        </div>
      )}

      {showHover && !loading && !error ? (
        <AnnotationResidueCallout
          mode="hover"
          annotation={hoverTip.annotation}
          group={
            hoverTip.annotation?.group
              ? groupMap.get(hoverTip.annotation.group)
              : null
          }
          layout={hoverLayout}
        />
      ) : null}

      {pinnedAnnotation && pinnedLayout && !loading && !error ? (
        <AnnotationResidueCallout
          mode="pinned"
          annotation={pinnedAnnotation.annotation}
          group={
            pinnedAnnotation.annotation?.group
              ? groupMap.get(pinnedAnnotation.annotation.group)
              : null
          }
          layout={pinnedLayout}
          onDismiss={() => setPinnedAnnotation(null)}
        />
      ) : null}
    </div>
  );
};

export default ProteinViewer;