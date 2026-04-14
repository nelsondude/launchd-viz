import { useState, useEffect, useCallback, useRef } from 'react'
import type { AgentInfo, AgentSource } from '../../../shared/types'

interface UseAgentsReturn {
  agents: AgentInfo[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAgents(
  sourceFilter: AgentSource | 'all',
  searchQuery: string,
  refreshTrigger = 0
): UseAgentsReturn {
  const [allAgents, setAllAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      const result = await window.launchd.listAgents()
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setAllAgents(result.data)
        setError(null)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    intervalRef.current = setInterval(fetchAgents, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAgents])

  // Refetch when refreshTrigger changes (manual refresh from parent)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAgents()
    }
  }, [refreshTrigger, fetchAgents])

  const filtered = allAgents.filter((agent) => {
    if (sourceFilter !== 'all' && agent.source !== sourceFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        agent.label.toLowerCase().includes(q) ||
        agent.plistPath.toLowerCase().includes(q)
      )
    }
    return true
  })

  return { agents: filtered, loading, error, refetch: fetchAgents }
}
