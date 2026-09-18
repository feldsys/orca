import { useCallback, useEffect, useState } from 'react'
import type { CustomTaskSourceSummary } from '../../../../../shared/custom-task-source-types'

type CustomTaskSourcesLoad = {
  /** null while loading. */
  sources: CustomTaskSourceSummary[] | null
  error: string | null
}

// Why: sources live in ~/.orca/task-sources.json; re-read on every visit to the
// Custom tab so file edits show up without restarting Orca.
export function useCustomTaskSources(active: boolean) {
  const [load, setLoad] = useState<CustomTaskSourcesLoad>({ sources: null, error: null })
  const [selectedId, setSelectedCustomTaskSourceId] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  useEffect(() => {
    if (!active) {
      return
    }
    let stale = false
    setLoad({ sources: null, error: null })
    window.api.customTasks.listSources().then(
      (result) => {
        if (!stale) {
          setLoad(
            result.ok
              ? { sources: result.sources, error: null }
              : { sources: [], error: result.error }
          )
        }
      },
      (error: unknown) => {
        if (!stale) {
          setLoad({ sources: [], error: error instanceof Error ? error.message : String(error) })
        }
      }
    )
    return () => {
      stale = true
    }
  }, [active, reloadNonce])
  const reloadCustomTaskSources = useCallback(() => setReloadNonce((n) => n + 1), [])
  return {
    customTaskSources: load.sources,
    customTaskSourcesError: load.error,
    selectedCustomTaskSource:
      load.sources?.find((source) => source.id === selectedId) ?? load.sources?.[0] ?? null,
    setSelectedCustomTaskSourceId,
    reloadCustomTaskSources
  }
}
