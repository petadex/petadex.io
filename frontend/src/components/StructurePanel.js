import React, { useEffect, useState } from "react";
import config from "../config";
import ProteinViewer from "./protein/ProteinViewer";
import AnnotatedProteinViewer from "./protein/AnnotatedProteinViewer";
import { annotationRecordForAccession } from "./protein/annotation-reference/annotations";

const SOURCE_LABEL = {
  experimental_pdb: "Experimental structure",
  esmfold2_centroid_90: "ESMFold2 · 90% centroid",
  esmfold2_orf: "ESMFold2 · ORF prediction",
};

/**
 * Unified 3D structure panel.
 * Resolves via GET /api/structure (experimental PDB or predicted mmCIF),
 * then mounts Mol* with the appropriate parse format.
 *
 * @param {{
 *   accession?: string | null,
 *   orfId?: string | number | null,
 *   title?: string,
 *   emptyMessage?: string,
 * }} props
 */
export default function StructurePanel({
  accession = null,
  orfId = null,
  title = "3D Structure Viewer",
  emptyMessage = "No structure available for this sequence yet.",
}) {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | empty | error
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (orfId == null && !accession) {
      setStatus("empty");
      setInfo(null);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setErrorMsg(null);
    setInfo(null);

    const url =
      orfId != null
        ? `${config.apiUrl}/structure/orf/${encodeURIComponent(String(orfId))}`
        : `${config.apiUrl}/structure/accession/${encodeURIComponent(accession)}`;

    fetch(url)
      .then(async res => {
        if (cancelled) return;
        if (res.status === 404) {
          setStatus("empty");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setStatus("error");
          setErrorMsg(body.error || `Request failed (${res.status})`);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setInfo(data);
        setStatus("ready");
      })
      .catch(err => {
        if (cancelled) return;
        console.error("Structure resolve error:", err);
        setStatus("error");
        setErrorMsg("Could not resolve structure.");
      });

    return () => {
      cancelled = true;
    };
  }, [orfId, accession]);

  const record =
    info?.source === "experimental_pdb" && info?.accession
      ? annotationRecordForAccession(info.accession)
      : null;

  const sourceLabel = info ? SOURCE_LABEL[info.source] || info.method || info.source : null;

  return (
    <div>
      <div className="rounded-2xl border-border overflow-hidden bg-surface-overlay">
        <div className="p-4 bg-surface-raised border-b-border-strong flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg m-0 text-muted-foreground font-semibold">{title}</h3>
          {sourceLabel && status === "ready" ? (
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
              {sourceLabel}
              {info?.format ? ` · ${info.format}` : ""}
            </span>
          ) : null}
        </div>

        {status === "loading" || status === "idle" ? (
          <div className="p-8 text-sm text-muted-foreground italic">
            Resolving structure…
          </div>
        ) : null}

        {status === "empty" ? (
          <div className="p-8 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : null}

        {status === "error" ? (
          <div className="p-8 text-sm text-destructive">{errorMsg}</div>
        ) : null}

        {status === "ready" && info && record ? (
          <div className="p-4 bg-secondary/20">
            <AnnotatedProteinViewer
              accession={info.accession}
              record={record}
              height="500px"
              showControls={true}
              variant="embedded"
            />
          </div>
        ) : null}

        {status === "ready" && info && !record ? (
          <div className="w-full h-[500px] bg-secondary">
            <ProteinViewer
              accession={info.accession || undefined}
              structureUrl={info.structure_url}
              format={info.format}
              label={
                info.orf_id != null
                  ? `ORF ${info.orf_id}`
                  : info.accession || "Structure"
              }
              width="100%"
              height="500px"
              showControls={true}
              enableMeasurement={true}
              enableSelection={true}
            />
          </div>
        ) : null}
      </div>

      {status === "ready" && info ? (
        <div className="mt-4 flex flex-col gap-2">
          <div className="p-4 bg-blue-300 rounded-lg border-l-info border-l-4">
            <p className="m-0 text-sm text-primary dark:text-secondary">
              <strong>Tip:</strong> Click and drag to rotate the structure. Scroll to
              zoom in/out.
              {record
                ? " Hover or click highlighted residues to read annotation notes."
                : ""}
            </p>
          </div>
          {info.metrics_url ? (
            <p className="m-0 text-xs text-muted-foreground">
              Quality metrics:{" "}
              <a
                href={info.metrics_url}
                className="text-info underline-offset-2 hover:underline break-all"
                target="_blank"
                rel="noreferrer"
              >
                {info.metrics_url}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
