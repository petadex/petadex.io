import React, { useEffect, useRef, useState } from "react";
import config from "../config";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre GL v5 dropped the WebGL1 fallback — it requests a "webgl2" context
// and throws "Failed to initialize WebGL" if it can't get one.
//
// Only called AFTER the map has already failed. iOS/WKWebView caps the number
// of live WebGL contexts per process and evicts the oldest when the cap is hit,
// so probing pre-flight would itself be a cause of the failure it reports.
function probeWebGL() {
  if (typeof document === "undefined") return { ok: false, reason: "no document" };
  let gl;
  try {
    const canvas = document.createElement("canvas");
    gl = canvas.getContext("webgl2");
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        ok: true,
        renderer: info
          ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
      };
    }
    const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    gl = gl1;
    return {
      ok: false,
      reason: gl1
        ? "WebGL1 is available but WebGL2 is not, this browser/device cannot run MapLibre v5."
        : "No WebGL context of any version could be created (Lockdown Mode, low memory, or an unsupported device).",
    };
  } catch (err) {
    return { ok: false, reason: `WebGL probe threw: ${err}` };
  } finally {
    // Setting width/height to 0 does NOT release a context; only this does.
    // Leaking it would consume one of the device's few remaining slots.
    if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

const VECTOR_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Low-memory fallback. Vector tiles cost far more GPU/JS memory than raster —
// glyph atlases, sprite sheets and tessellated geometry are all allocated
// during style load, which is exactly where 2 GB iPads lose the context.
// Plain raster tiles need none of that.
const RASTER_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "carto-raster", type: "raster", source: "carto" }],
};

const MetadataMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [mapFailure, setMapFailure] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  // 0 = native resolution; 1 = reduced GPU footprint after a context loss.
  const [renderTier, setRenderTier] = useState(0);

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

    let restoreTimer;
    let styleLoaded = false;
    setMapFailure(null); // clear any overlay left over from a previous tier
    logDiag(`UA: ${navigator.userAgent}`);

    const container = mapContainerRef.current;
    const rect = container.getBoundingClientRect();
    logDiag(`Container: ${Math.round(rect.width)}x${Math.round(rect.height)}px`);

    const maplibregl = require("maplibre-gl");

    let map;
    try {
      map = new maplibregl.Map({
        container,
        style: renderTier > 0 ? RASTER_STYLE : VECTOR_STYLE,
        center: [0, 20],
        zoom: 0,
        // pixelRatio 1 quarters the drawing buffer (~9 MB → ~2.3 MB at this
        // container size). Secondary to the raster swap, but free.
        ...(renderTier > 0 ? { pixelRatio: 1 } : {}),
      });
      logDiag(
        `map constructed (tier ${renderTier}, ${
          renderTier > 0 ? "raster" : "vector"
        })`
      );
    } catch (err) {
      logDiag(`Map constructor threw: ${err}`);
      const gl = probeWebGL();
      logDiag(gl.ok ? `WebGL2 itself is OK, renderer: ${gl.renderer}` : gl.reason);
      setMapFailure(gl.ok ? String(err) : gl.reason);
      return;
    }

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Without these, every failure below this point is an invisible blank box.
    map.on("error", e => logDiag(`map error: ${e?.error?.message || e?.error || e}`));

    // MapLibre calls preventDefault() on loss and re-applies the style on
    // restore, so this is recoverable — the overlay must not latch, or it
    // would hide a map that came back.
    map.on("webglcontextlost", () => {
      logDiag(
        `WebGL context LOST (tier ${renderTier}, style ${
          styleLoaded ? "loaded" : "still loading"
        })`
      );
      setMapFailure(
        "This browser dropped the map's graphics context, the device ran out of memory rendering it."
      );
      // If MapLibre's own restore doesn't land, rebuild once on the cheap
      // raster basemap instead of leaving a permanently dead map.
      if (renderTier === 0) {
        restoreTimer = setTimeout(() => {
          logDiag("no restore after 3s, rebuilding on raster basemap");
          setRenderTier(1);
        }, 3000);
      }
    });
    map.on("webglcontextrestored", () => {
      logDiag("WebGL context restored");
      clearTimeout(restoreTimer);
      setMapFailure(null);
    });

    map.on("load", () => {
      styleLoaded = true;
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
          `first frame idle, tiles loaded: ${map.areTilesLoaded()}, rendered features: ${
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
      clearTimeout(restoreTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [loading, error, locations, renderTier]);

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
        {/* Sized with w/h-full, not `absolute inset-0`: MapLibre adds its own
            `.maplibregl-map { position: relative }` rule, which has the same
            specificity as Tailwind's `.absolute` and wins whenever
            maplibre-gl.css is emitted after the utilities. The inset offsets
            then apply to nothing, the container collapses to 0px, and
            `overflow: hidden` clips the canvas — a blank box with a
            fully-loaded map inside it. */}
        <div ref={mapContainerRef} className='w-full h-full' />
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
