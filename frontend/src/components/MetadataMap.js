import React, { useEffect, useRef, useState } from "react";
import config from "../config";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre GL v5 dropped the WebGL1 fallback — it requests a "webgl2" context
// and throws "Failed to initialize WebGL" if it can't get one. iOS/iPadOS
// denies WebGL2 in Lockdown Mode, under memory pressure, and on iPadOS < 15,
// so probe up front and report instead of rendering an empty box.
function probeWebGL() {
  if (typeof document === "undefined") return { ok: false, reason: "no document" };
  let canvas;
  try {
    canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    if (gl2) {
      const info = gl2.getExtension("WEBGL_debug_renderer_info");
      return {
        ok: true,
        renderer: info
          ? gl2.getParameter(info.UNMASKED_RENDERER_WEBGL)
          : gl2.getParameter(gl2.RENDERER),
      };
    }
    const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return {
      ok: false,
      reason: gl1
        ? "WebGL1 is available but WebGL2 is not — this browser/device cannot run MapLibre v5."
        : "No WebGL context of any version could be created (Lockdown Mode, low memory, or an unsupported device).",
    };
  } catch (err) {
    return { ok: false, reason: `WebGL probe threw: ${err}` };
  } finally {
    // Free the probe context immediately; iOS caps live WebGL contexts.
    if (canvas) canvas.width = canvas.height = 0;
  }
}

const MetadataMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [mapFailure, setMapFailure] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);

  const logDiag = message =>
    setDiagnostics(prev => [...prev, message].slice(-25));

  const showDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("mapdebug");

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch(`${config.apiUrl}/gene-details/locations`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const { locations: locs, stats: serverStats } = await res.json();
        setLocations(locs);
        setStats({
          totalSamples: parseInt(serverStats.total_samples),
          countries: parseInt(serverStats.total_countries),
          continents: parseInt(serverStats.total_continents),
          biomes: parseInt(serverStats.total_biomes),
        });
      } catch (err) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || loading || error || !locations.length) return;
    if (mapRef.current) return;

    const gl = probeWebGL();
    logDiag(`UA: ${navigator.userAgent}`);
    logDiag(
      gl.ok ? `WebGL2 OK — renderer: ${gl.renderer}` : `WebGL2 unavailable — ${gl.reason}`
    );
    if (!gl.ok) {
      setMapFailure(gl.reason);
      return;
    }

    const container = mapContainerRef.current;
    const rect = container.getBoundingClientRect();
    logDiag(`Container: ${Math.round(rect.width)}x${Math.round(rect.height)}px`);

    const maplibregl = require("maplibre-gl");

    let map;
    try {
      map = new maplibregl.Map({
        container,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [0, 20],
        zoom: 0,
      });
    } catch (err) {
      logDiag(`Map constructor threw: ${err}`);
      setMapFailure(String(err));
      return;
    }

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Without these, every failure below this point is an invisible blank box.
    map.on("error", e => logDiag(`map error: ${e?.error?.message || e?.error || e}`));
    map.getCanvas().addEventListener("webglcontextlost", () => {
      logDiag("WebGL context lost (iOS reclaims contexts under memory pressure)");
      setMapFailure("The browser dropped the map's WebGL context. Reload the page.");
    });

    map.on("load", () => {
      logDiag("style loaded");
      // iOS Safari occasionally reports a stale container size during the
      // sticky-header/tab layout pass; re-measure once the style is up.
      map.resize();

      // Distinguishes "the canvas never got a size" from "it rendered but is
      // not visible" — the latter points at CSS compositing, not MapLibre.
      const canvas = map.getCanvas();
      logDiag(
        `canvas backing ${canvas.width}x${canvas.height}, css ${canvas.clientWidth}x${canvas.clientHeight}, dpr ${window.devicePixelRatio}`
      );

      map.once("idle", () => {
        logDiag(
          `first frame idle — tiles loaded: ${map.areTilesLoaded()}, rendered features: ${
            map.queryRenderedFeatures().length
          }`
        );
      });
      const geojson = {
        type: "FeatureCollection",
        features: locations.map(loc => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [loc.longitude, loc.latitude],
          },
          properties: {
            accession: loc.accession,
            country: loc.country || "Unknown",
            continent: loc.continent || "Unknown",
            biome: loc.biome || "Unknown",
            organism: loc.organism || "Unknown",
            elevation: loc.elevation,
            location_name: loc.location_name || "",
          },
        })),
      };

      map.addSource("locations", { type: "geojson", data: geojson });

      map.addLayer({
        id: "location-circles",
        type: "circle",
        source: "locations",
        paint: {
          "circle-radius": 6,
          "circle-color": "#3b82f6",
          "circle-opacity": 0.7,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#1d4ed8",
        },
      });

      map.on("click", "location-circles", (e) => {
        const feature = e.features[0];
        const props = feature.properties;
        const coords = feature.geometry.coordinates.slice();

        // Wrap longitude for repeated world copies
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
        }

        const elevationLine = props.elevation
          ? `<p style="margin:0.25rem 0;"><strong>Elevation:</strong> ${props.elevation}m</p>`
          : "";

        const popupHTML = `
          <div style="font-size:0.85rem;max-width:260px;line-height:1.5;color:#1e293b;">
            <h4 style="margin:0 0 0.5rem;font-size:0.95rem;">
              <a href="/sequence/${props.accession}"
                 style="color:#2563eb;text-decoration:none;font-family:SFMono-Regular,Menlo,Monaco,monospace;">
                ${props.accession}
              </a>
            </h4>
            <p style="margin:0.25rem 0;"><strong>Country:</strong> ${props.country}</p>
            <p style="margin:0.25rem 0;"><strong>Continent:</strong> ${props.continent}</p>
            <p style="margin:0.25rem 0;"><strong>Biome:</strong> ${props.biome}</p>
            <p style="margin:0.25rem 0;"><strong>Organism:</strong> ${props.organism}</p>
            ${elevationLine}
          </div>
        `;

        new maplibregl.Popup({ offset: 10 })
          .setLngLat(coords)
          .setHTML(popupHTML)
          .addTo(map);
      });

      map.on("mouseenter", "location-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "location-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading, error, locations]);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        Loading location data...
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8 text-center text-primary bg-surface rounded-xl border border-border'>
        Error loading location data: {error}
      </div>
    );
  }

  if (!locations.length) {
    return (
      <div className='p-12 text-center text-primary'>
        No location data available.
      </div>
    );
  }

  return (
    <div>
      {stats && (
        <div className='grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 mb-6 p-4 bg-surface rounded-sm border border-border'>
          <div>
            <div className='text-sm text-muted-foreground mb-1'>
              Total Samples
            </div>
            <div className='text-2xl text-primary font-semibold'>
              {stats.totalSamples.toLocaleString()}
            </div>
          </div>
          <div>
            <div className='text-sm text-muted-foreground mb-1'>
              Countries
            </div>
            <div className='text-2xl text-primary font-semibold'>
              {stats.countries.toLocaleString()}
            </div>
          </div>
          <div>
            <div className='text-sm text-muted-foreground mb-1'>
              Continents
            </div>
            <div className='text-2xl text-primary font-semibold'>
              {stats.continents.toLocaleString()}
            </div>
          </div>
          <div>
            <div className='text-sm text-muted-foreground mb-1'>
              Biomes
            </div>
            <div className='text-2xl text-primary font-semibold'>
              {stats.biomes.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div className='relative w-full h-[600px] rounded-lg border border-border overflow-hidden'>
        <div ref={mapContainerRef} className='absolute inset-0' />
        {mapFailure && (
          <div className='absolute inset-0 flex items-center justify-center p-6 bg-surface'>
            <div className='max-w-md text-center'>
              <p className='text-primary font-semibold mb-2'>
                The map could not be rendered on this device
              </p>
              <p className='text-sm text-muted-foreground'>{mapFailure}</p>
            </div>
          </div>
        )}
      </div>

      {/* Append ?mapdebug=1 to read the render trace on a device with no
          devtools access (iPad Chrome/Safari cannot be remote-inspected). */}
      {(mapFailure || showDebug) && diagnostics.length > 0 && (
        <pre className='mt-4 p-3 text-2xs whitespace-pre-wrap break-words bg-surface border border-border rounded-sm text-muted-foreground'>
          {diagnostics.join("\n")}
        </pre>
      )}
    </div>
  );
};

export default MetadataMap;
