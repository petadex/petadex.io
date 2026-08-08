import React, { useEffect, useRef, useState } from "react";
import config from "../config";
import "maplibre-gl/dist/maplibre-gl.css";

const MetadataMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

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

    const maplibregl = require("maplibre-gl");

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [0, 20],
      zoom: 0,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
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
            <p style="margin:0.25rem 0;"><strong>Organism:</strong>
              <a href="/organism/${encodeURIComponent(props.organism)}"
                 style="color:#2563eb;text-decoration:none;font-style:italic;">
                ${props.organism}
              </a>
            </p>
            ${elevationLine}
            <p style="margin:0.5rem 0 0;">
              <a href="/biosamples" style="color:#2563eb;font-size:0.8rem;">Browse biosamples →</a>
            </p>
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

      <div
        ref={mapContainerRef}
        className='w-full h-[600px] rounded-lg border border-border overflow-hidden'
      />
    </div>
  );
};

export default MetadataMap;
