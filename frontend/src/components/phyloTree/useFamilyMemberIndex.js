import { useState, useEffect, useMemo } from "react"
import config from "../../config"

/**
 * @returns {Map<string, { enzyme_id, accession, component, family_pid, organism, country }>}
 */
export function useFamilyMemberIndex(familyId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!familyId) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${config.apiUrl}/family/${familyId}/tree-members`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to load family members")
        return r.json()
      })
      .then(data => {
        if (!cancelled) {
          setMembers(data.members || [])
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [familyId])

  const memberIndex = useMemo(() => {
    const map = new Map()
    for (const m of members) {
      map.set(String(m.enzyme_id), {
        enzyme_id: m.enzyme_id,
        accession: m.genbank_accession_id,
        component: m.component,
        family_pid: m.family_pid,
        organism: m.organism ?? null,
        country: m.country ?? null,
      })
    }
    return map
  }, [members])

  return { memberIndex, members, loading, error }
}
