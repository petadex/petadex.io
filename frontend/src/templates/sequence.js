// frontend/src/templates/sequence.js
import React, { useState, useEffect } from "react"
import DataViewer from "../components/sequence/DataViewer"
import SynthesizedGenePanel from "../components/SynthesizedGenePanel"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"

export default function SequenceTemplate({ pageContext }) {
  const [sequence, setSequence] = useState(pageContext.sequence || null)
  const [geneMetadata, setGeneMetadata] = useState([])
  const [headerData, setHeaderData] = useState(null)
  const [plateData, setPlateData] = useState({})
  const [summaryStats, setSummaryStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [loading, setLoading] = useState(!pageContext.sequence)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (pageContext.sequence) return

    const path = window.location.pathname
    const match = path.match(/\/sequence\/([^/]+)/)

    if (!match) {
      setError("Invalid sequence URL")
      setLoading(false)
      return
    }

    const accession = match[1]

    async function fetchSequence() {
      try {
        const res = await fetch(`${config.apiUrl}/fastaa/${accession}`)
        if (!res.ok) throw new Error(`Sequence not found: ${accession}`)
        const data = await res.json()
        setSequence(data)
      } catch (err) {
        setError(err.toString())
      } finally {
        setLoading(false)
      }
    }

    fetchSequence()
  }, [pageContext.sequence])

  useEffect(() => {
    if (!sequence?.accession) return

    const accession = sequence.accession

    async function fetchData() {
      try {
        const metadataRes = await fetch(
          `${config.apiUrl}/gene-metadata/by-accession/${accession}`,
        )
        if (metadataRes.ok) {
          const data = await metadataRes.json()
          setGeneMetadata(Array.isArray(data) ? data : [data])
        }

        const headerRes = await fetch(
          `${config.apiUrl}/gene-details/${accession}/header`,
        )
        if (headerRes.ok) {
          const data = await headerRes.json()
          setHeaderData(data)
        }
      } catch (err) {
        console.error("Error fetching data:", err)
      }
    }

    fetchData()
  }, [sequence?.accession])

  useEffect(() => {
    if (!sequence?.accession) return

    const accession = sequence.accession

    async function fetchSummaryStats() {
      try {
        setStatsLoading(true)
        const response = await fetch(
          `${config.apiUrl}/aa-seq-features/${accession}`,
        )
        if (!response.ok) throw new Error("Features not found")
        const data = await response.json()
        setSummaryStats(calculateStats(data))
      } catch (err) {
        console.error("Error fetching summary stats:", err)
        setSummaryStats(null)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchSummaryStats()
  }, [sequence?.accession])

  useEffect(() => {
    if (!geneMetadata || geneMetadata.length === 0) return

    async function fetchPlateData() {
      const dataPromises = geneMetadata.map(async gene => {
        if (!gene.gene) return null
        try {
          const res = await fetch(
            `${config.apiUrl}/plate-data/gene/${gene.gene}/average`,
          )
          if (res.ok) {
            const data = await res.json()
            return { geneId: gene.gene, data }
          }
        } catch (err) {
          console.error(`Error fetching plate data for ${gene.gene}:`, err)
        }
        return null
      })

      const results = await Promise.all(dataPromises)
      const dataMap = {}
      results.forEach(result => {
        if (result) dataMap[result.geneId] = result.data
      })
      setPlateData(dataMap)
    }

    fetchPlateData()
  }, [geneMetadata])

  const calculateStats = data => {
    const { mass, pi, hpath, sequence_length } = data
    const totalMass = mass ? mass.reduce((sum, val) => sum + val, 0) : 0
    const avgPI =
      pi && pi.length > 0
        ? pi.reduce((sum, val) => sum + val, 0) / pi.length
        : 0
    const hydrophobicCount = hpath ? hpath.filter(val => val > 0.5).length : 0
    const percentHydrophobic =
      sequence_length > 0 ? (hydrophobicCount / sequence_length) * 100 : 0
    return {
      totalMass: totalMass.toFixed(2),
      avgPI: avgPI.toFixed(2),
      percentHydrophobic: percentHydrophobic.toFixed(1),
      sequenceLength: sequence_length,
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading sequence...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">Error: {error}</div>
    )
  }

  if (!sequence) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Sequence not found
      </div>
    )
  }

  return (
    <>
      <Container className="p-8">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-5xl font-semibold text-foreground mb-2">
            <a
              href={`https://www.ncbi.nlm.nih.gov/protein/${sequence.accession}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground border-b-2 border-accent hover:text-accent"
            >
              {sequence.accession}
            </a>
          </h1>

          {headerData && (
            <div className="flex gap-6 text-muted-foreground text-sm mt-4">
              {headerData.origin_country && (
                <span>
                  Origin:{" "}
                  <strong className="text-foreground">
                    {headerData.origin_country}
                  </strong>
                </span>
              )}
              {headerData.temperature && (
                <span>
                  Temperature:{" "}
                  <strong className="text-foreground">
                    {headerData.temperature}°C
                  </strong>
                </span>
              )}
            </div>
          )}

          <p className="text-muted-foreground text-base mt-2">
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
      </Container>
    </>
  )
}

export const Head = ({ pageContext }) => {
  const accession = pageContext?.sequence?.accession || "Sequence"
  return (
    <Seo
      title={`${accession} - Enzyme Sequence`}
      description={`View details for plastic-degrading enzyme ${accession} including sequence data, structure, and experimental results.`}
    />
  )
}
