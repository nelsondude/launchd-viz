import { Badge } from '@mantine/core'
import type { AgentInfo } from '../../../shared/types'

interface StatusBadgeProps {
  agent: AgentInfo
}

export function StatusBadge({ agent }: StatusBadgeProps) {
  if (!agent.isLoaded) {
    return (
      <Badge color="gray" variant="light" size="sm">
        Unloaded
      </Badge>
    )
  }

  if (agent.status?.pid != null && agent.status.pid > 0) {
    return (
      <Badge color="green" variant="light" size="sm">
        Running
      </Badge>
    )
  }

  if (agent.status?.lastExitStatus != null && agent.status.lastExitStatus !== 0) {
    return (
      <Badge color="red" variant="light" size="sm">
        Error ({agent.status.lastExitStatus})
      </Badge>
    )
  }

  return (
    <Badge color="yellow" variant="light" size="sm">
      Loaded
    </Badge>
  )
}
