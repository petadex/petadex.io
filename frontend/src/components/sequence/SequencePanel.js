// frontend/src/components/SequencePanel.js
import React from "react";
import SequenceViewer from "./SequenceViewer";
import SummaryStatistics from "../SummaryStatistics";
import LazyPetadexCatalyticDomainsPanel from "../petadexDomains/LazyPetadexCatalyticDomainsPanel.jsx";

export default function SequencePanel({ sequence, accession, summaryStats, statsLoading }) {
  if (!sequence) {
    return (
      <div className='p-8 text-center text-primary'>
        No sequence data available
      </div>
    );
  }

  return (
    <div>
      <SummaryStatistics
        stats={summaryStats}
        loading={statsLoading}
      />

      <LazyPetadexCatalyticDomainsPanel
        accession={accession}
        sequence={sequence}
        className="mb-6"
      />

      <div className='mb-4 text-sm text-slate-500'>
        <strong>Length:</strong> {sequence.length} amino acids
      </div>

      <SequenceViewer
        aminoAcidSequence={sequence}
        header={accession}
        nucleotideSequence={null}
      />
    </div>
  );
}
