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
  Code
} from '@mantine/core'
import {
  IconSearch,
  IconPlayerPlay,
  IconPlayerStop,
  IconUpload,
  IconDownload,
  IconFolder,
  IconX
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import type { AgentInfo, AgentSource } from '../../../shared/types'
import { StatusBadge } from './StatusBadge'
import { useAgents } from '../hooks/useAgents'
import { formatSchedule } from '../utils/schedule'

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

export function AgentList({ onSelect, refreshTrigger }: AgentListProps) {
  const [sourceFilter, setSourceFilter] = useState<AgentSource | 'all'>('all')
  const [search, setSearch] = useState('')
  const { agents, loading, error, refetch } = useAgents(sourceFilter, search, refreshTrigger)

  const handleAction = async (
    action: () => Promise<unknown>,
    successMsg: string
  ) => {
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
            <Table.Th>Status</Table.Th>
            <Table.Th>Label</Table.Th>
            <Table.Th>PID</Table.Th>
            <Table.Th>Source</Table.Th>
            <Table.Th>Schedule</Table.Th>
            <Table.Th>RunAtLoad</Table.Th>
            <Table.Th>KeepAlive</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {agents.map((agent) => (
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
                <Text size="xs" c="dimmed">
                  {formatSchedule(agent.plist)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{agent.plist.RunAtLoad ? 'Yes' : 'No'}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">
                  {agent.plist.KeepAlive === true
                    ? 'Yes'
                    : agent.plist.KeepAlive
                      ? 'Conditional'
                      : 'No'}
                </Text>
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
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
