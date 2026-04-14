import {
  Table,
  TextInput,
  SegmentedControl,
  Group,
  Stack,
  Text,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Code,
  UnstyledButton
} from '@mantine/core'
import {
  IconSearch,
  IconPlayerPlay,
  IconPlayerStop,
  IconUpload,
  IconDownload,
  IconFolder,
  IconX,
  IconChevronUp,
  IconChevronDown,
  IconSelector
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useState, useMemo } from 'react'
import type { AgentInfo, AgentSource } from '../../../shared/types'
import { StatusBadge } from './StatusBadge'
import { useAgents } from '../hooks/useAgents'
import { formatSchedule, scheduleTooltip } from '../utils/schedule'

interface AgentListProps {
  onSelect: (agent: AgentInfo) => void
  refreshTrigger: number
}

const SOURCE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'User Agents', value: 'user-agents' },
  { label: 'System Agents', value: 'system-agents' },
  { label: 'System Daemons', value: 'system-daemons' }
]

type SortKey = 'label' | 'status' | 'pid' | 'source' | 'schedule' | 'runAtLoad' | 'keepAlive'
type SortDir = 'asc' | 'desc'

function sourceLabel(source: AgentSource): string {
  switch (source) {
    case 'user-agents':
      return 'User'
    case 'system-agents':
      return 'System'
    case 'system-daemons':
      return 'Daemon'
  }
}

function getStatusOrder(agent: AgentInfo): number {
  if (!agent.isLoaded) return 0 // unloaded
  if (agent.status?.pid) return 3 // running
  if (agent.status?.lastExitStatus !== null && agent.status?.lastExitStatus !== 0) return 2 // error
  return 1 // loaded
}

function getKeepAliveLabel(agent: AgentInfo): string {
  return agent.plist.KeepAlive === true ? 'Yes' : agent.plist.KeepAlive ? 'Conditional' : 'No'
}

function compareAgents(a: AgentInfo, b: AgentInfo, key: SortKey): number {
  switch (key) {
    case 'label':
      return a.label.localeCompare(b.label)
    case 'status':
      return getStatusOrder(a) - getStatusOrder(b)
    case 'pid':
      return (a.status?.pid ?? 0) - (b.status?.pid ?? 0)
    case 'source':
      return sourceLabel(a.source).localeCompare(sourceLabel(b.source))
    case 'schedule':
      return formatSchedule(a.plist).localeCompare(formatSchedule(b.plist))
    case 'runAtLoad':
      return (a.plist.RunAtLoad ? 1 : 0) - (b.plist.RunAtLoad ? 1 : 0)
    case 'keepAlive':
      return getKeepAliveLabel(a).localeCompare(getKeepAliveLabel(b))
    default:
      return 0
  }
}

function SortIcon({ sortKey, current, dir }: { sortKey: SortKey; current: SortKey | null; dir: SortDir }) {
  if (current !== sortKey) return <IconSelector size={14} style={{ opacity: 0.3 }} />
  return dir === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey | null
  currentDir: SortDir
  onSort: (key: SortKey) => void
}) {
  return (
    <UnstyledButton onClick={() => onSort(sortKey)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      <SortIcon sortKey={sortKey} current={currentSort} dir={currentDir} />
    </UnstyledButton>
  )
}

export function AgentList({ onSelect, refreshTrigger }: AgentListProps) {
  const [sourceFilter, setSourceFilter] = useState<AgentSource | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const { agents, loading, error, refetch } = useAgents(sourceFilter, search, refreshTrigger)

  const sortedAgents = useMemo(() => {
    if (!sortKey) return agents
    const sorted = [...agents].sort((a, b) => compareAgents(a, b, sortKey))
    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [agents, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else {
        // Third click clears sort
        setSortKey(null)
        setSortDir('asc')
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleAction = async (action: () => Promise<unknown>, successMsg: string) => {
    try {
      const result = (await action()) as { error?: string }
      if (result?.error) {
        notifications.show({ title: 'Error', message: result.error, color: 'red' })
      } else {
        notifications.show({ title: 'Success', message: successMsg, color: 'green' })
        await refetch()
      }
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: (e as Error).message,
        color: 'red'
      })
    }
  }

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (error) {
    return (
      <Center h={400}>
        <Text c="red">{error}</Text>
      </Center>
    )
  }

  const thProps = { currentSort: sortKey, currentDir: sortDir, onSort: handleSort }

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          placeholder="Search agents..."
          leftSection={<IconSearch size={16} />}
          rightSection={
            search ? (
              <ActionIcon size="sm" variant="subtle" onClick={() => setSearch('')}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <SegmentedControl
          value={sourceFilter}
          onChange={(v) => setSourceFilter(v as AgentSource | 'all')}
          data={SOURCE_OPTIONS}
          size="sm"
        />
      </Group>

      <Text size="sm" c="dimmed">
        {agents.length} agent{agents.length !== 1 ? 's' : ''}
      </Text>

      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              <SortableHeader label="Status" sortKey="status" {...thProps} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="Label" sortKey="label" {...thProps} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="PID" sortKey="pid" {...thProps} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="Source" sortKey="source" {...thProps} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="Schedule" sortKey="schedule" {...thProps} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="RunAtLoad" sortKey="runAtLoad" {...thProps} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="KeepAlive" sortKey="keepAlive" {...thProps} />
            </Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedAgents.map((agent) => {
            const tip = scheduleTooltip(agent.plist)
            return (
              <Table.Tr
                key={agent.plistPath}
                onClick={() => onSelect(agent)}
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>
                  <StatusBadge agent={agent} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} truncate="end" maw={350}>
                    {agent.label}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Code>{agent.status?.pid ?? '–'}</Code>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {sourceLabel(agent.source)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {tip ? (
                    <Tooltip label={tip} multiline maw={350} withArrow>
                      <Text size="xs" c="dimmed" style={{ cursor: 'help' }}>
                        {formatSchedule(agent.plist)}
                      </Text>
                    </Tooltip>
                  ) : (
                    <Text size="xs" c="dimmed">
                      {formatSchedule(agent.plist)}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{agent.plist.RunAtLoad ? 'Yes' : 'No'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{getKeepAliveLabel(agent)}</Text>
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Group gap={4} wrap="nowrap">
                    {agent.isLoaded ? (
                      <>
                        {agent.status?.pid ? (
                          <Tooltip label="Stop">
                            <ActionIcon
                              variant="subtle"
                              color="orange"
                              size="sm"
                              onClick={() =>
                                handleAction(
                                  () => window.launchd.stopAgent(agent.label),
                                  `Stopped ${agent.label}`
                                )
                              }
                            >
                              <IconPlayerStop size={14} />
                            </ActionIcon>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Start">
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              size="sm"
                              onClick={() =>
                                handleAction(
                                  () => window.launchd.startAgent(agent.label),
                                  `Started ${agent.label}`
                                )
                              }
                            >
                              <IconPlayerPlay size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Unload">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() =>
                              handleAction(
                                () =>
                                  window.launchd.unloadAgent(agent.plistPath, agent.label),
                                `Unloaded ${agent.label}`
                              )
                            }
                          >
                            <IconDownload size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip label="Load">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          onClick={() =>
                            handleAction(
                              () => window.launchd.loadAgent(agent.plistPath),
                              `Loaded ${agent.label}`
                            )
                          }
                        >
                          <IconUpload size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Reveal in Finder">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => window.launchd.revealInFinder(agent.plistPath)}
                      >
                        <IconFolder size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
