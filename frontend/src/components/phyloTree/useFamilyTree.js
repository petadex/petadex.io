import { useState, useEffect, useMemo } from "react"
import config from "../../config"
import { parseNewick } from "./parseNewick"

/**
 * @param {string|number} familyId
 */
export function useFamilyTree(familyId) {
  const [nwk, setNwk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const treeUrl = `${config.apiUrl}/family/${familyId}/tree`

  useEffect(() => {
    if (!familyId) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    setNwk(null)

    fetch(treeUrl)
      .then(r => {
        if (!r.ok) throw new Error(`No tree found for Family ${familyId}`)
        return r.text()
      })
      .then(text => {
        if (!cancelled) {
          setNwk(text.trim())
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
  }, [familyId, treeUrl])

  const { treeRoot, parseError } = useMemo(() => {
    if (!nwk) return { treeRoot: null, parseError: null }
    try {
      return { treeRoot: parseNewick(nwk), parseError: null }
    } catch {
      return { treeRoot: null, parseError: "Failed to parse Newick format." }
    }
  }, [nwk])

  return { nwk, treeRoot, loading, error, parseError, treeUrl }
}
