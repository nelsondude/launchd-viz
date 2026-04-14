import { useState, useEffect } from 'react'
import {
  Drawer,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Tabs,
  Table,
  Textarea,
  Code,
  Divider,
  Badge,
  Loader,
  Center
} from '@mantine/core'
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconUpload,
  IconDownload,
  IconTrash,
  IconEdit,
  IconFolder,
  IconDeviceFloppy,
  IconRefresh
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import type { AgentInfo, ServiceRunInfo } from '../../../shared/types'
import { StatusBadge } from './StatusBadge'
import { formatSchedule } from '../utils/schedule'

interface AgentDetailProps {
  agent: AgentInfo | null
  onClose: () => void
  onEdit: (agent: AgentInfo) => void
  onRefetch: () => void
}

export function AgentDetail({ agent, onClose, onEdit, onRefetch }: AgentDetailProps) {
  const [rawXml, setRawXml] = useState('')
  const [editingXml, setEditingXml] = useState(false)
  const [xmlContent, setXmlContent] = useState('')
  const [runInfo, setRunInfo] = useState<ServiceRunInfo | null>(null)
  const [runInfoLoading, setRunInfoLoading] = useState(false)

  useEffect(() => {
    if (agent) {
      window.launchd.readPlistRaw(agent.plistPath).then((result) => {
        if (result.data) {
          setRawXml(result.data)
          setXmlContent(result.data)
        }
      })
      setEditingXml(false)
      setRunInfo(null)
    }
  }, [agent])

  const fetchRunInfo = async () => {
    if (!agent) return
    setRunInfoLoading(true)
    try {
      const result = await window.launchd.getServiceRunInfo(agent.label)
      if (result.data) setRunInfo(result.data)
    } finally {
      setRunInfoLoading(false)
    }
  }

  if (!agent) return null

  const handleAction = async (action: () => Promise<unknown>, successMsg: string) => {
    try {
      const result = (await action()) as { error?: string }
      if (result?.error) {
        notifications.show({ title: 'Error', message: result.error, color: 'red' })
      } else {
        notifications.show({ title: 'Success', message: successMsg, color: 'green' })
        onRefetch()
      }
    } catch (e) {
      notifications.show({ title: 'Error', message: (e as Error).message, color: 'red' })
    }
  }

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete Agent',
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{agent.label}</strong>? This will unload the
          agent and remove the plist file. This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await handleAction(
          () => window.launchd.deleteAgent(agent.plistPath, agent.label),
          `Deleted ${agent.label}`
        )
        onClose()
      }
    })
  }

  const handleSaveXml = async () => {
    const result = await window.launchd.updateAgentRaw(agent.plistPath, xmlContent)
    if (result.error) {
      notifications.show({ title: 'Error', message: result.error, color: 'red' })
    } else {
      notifications.show({ title: 'Saved', message: 'Plist updated', color: 'green' })
      setRawXml(xmlContent)
      setEditingXml(false)
      onRefetch()
    }
  }

  const plist = agent.plist
  const configRows = [
    ['Label', plist.Label],
    ['Program', plist.Program ?? '–'],
    ['ProgramArguments', plist.ProgramArguments?.join(' ') ?? '–'],
    ['RunAtLoad', plist.RunAtLoad ? 'Yes' : 'No'],
    [
      'KeepAlive',
      plist.KeepAlive === true
        ? 'Yes'
        : typeof plist.KeepAlive === 'object'
          ? JSON.stringify(plist.KeepAlive)
          : 'No'
    ],
    ['Schedule', formatSchedule(plist)],
    ['StartInterval', plist.StartInterval != null ? `${plist.StartInterval}s` : '–'],
    [
      'StartCalendarInterval',
      plist.StartCalendarInterval ? JSON.stringify(plist.StartCalendarInterval) : '–'
    ],
    ['WorkingDirectory', plist.WorkingDirectory ?? '–'],
    ['StandardOutPath', plist.StandardOutPath ?? '–'],
    ['StandardErrorPath', plist.StandardErrorPath ?? '–'],
    [
      'EnvironmentVariables',
      plist.EnvironmentVariables ? JSON.stringify(plist.EnvironmentVariables) : '–'
    ],
    ['Disabled', plist.Disabled ? 'Yes' : 'No']
  ]

  return (
    <Drawer
      opened={!!agent}
      onClose={onClose}
      title={
        <Group>
          <Title order={4}>{agent.label}</Title>
          <StatusBadge agent={agent} />
        </Group>
      }
      position="right"
      size="lg"
      padding="lg"
    >
      <Stack gap="md">
        {/* Action buttons */}
        <Group gap="xs">
          {agent.isLoaded ? (
            <>
              {agent.status?.pid ? (
                <Button
                  size="xs"
                  variant="light"
                  color="orange"
                  leftSection={<IconPlayerStop size={14} />}
                  onClick={() =>
                    handleAction(
                      () => window.launchd.stopAgent(agent.label),
                      `Stopped ${agent.label}`
                    )
                  }
                >
                  Stop
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="light"
                  color="green"
                  leftSection={<IconPlayerPlay size={14} />}
                  onClick={() =>
                    handleAction(
                      () => window.launchd.startAgent(agent.label),
                      `Started ${agent.label}`
                    )
                  }
                >
                  Start
                </Button>
              )}
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconDownload size={14} />}
                onClick={() =>
                  handleAction(
                    () => window.launchd.unloadAgent(agent.plistPath, agent.label),
                    `Unloaded ${agent.label}`
                  )
                }
              >
                Unload
              </Button>
            </>
          ) : (
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconUpload size={14} />}
              onClick={() =>
                handleAction(
                  () => window.launchd.loadAgent(agent.plistPath),
                  `Loaded ${agent.label}`
                )
              }
            >
              Load
            </Button>
          )}
          <Button
            size="xs"
            variant="light"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEdit(agent)}
          >
            Edit
          </Button>
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<IconFolder size={14} />}
            onClick={() => window.launchd.revealInFinder(agent.plistPath)}
          >
            Reveal
          </Button>
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          {agent.plistPath}
        </Text>

        {agent.status && (
          <Group gap="lg">
            <Text size="sm">
              PID: <Code>{agent.status.pid ?? '–'}</Code>
            </Text>
            <Text size="sm">
              Exit Status: <Code>{agent.status.lastExitStatus ?? '–'}</Code>
            </Text>
          </Group>
        )}

        <Divider />

        <Tabs defaultValue="config">
          <Tabs.List>
            <Tabs.Tab value="config">Configuration</Tabs.Tab>
            <Tabs.Tab value="history" onClick={fetchRunInfo}>
              Run History
            </Tabs.Tab>
            <Tabs.Tab value="xml">XML</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="config" pt="md">
            <Table withTableBorder withColumnBorders>
              <Table.Tbody>
                {configRows.map(([key, value]) => (
                  <Table.Tr key={key}>
                    <Table.Td w={180}>
                      <Text size="sm" fw={600}>
                        {key}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ wordBreak: 'break-all' }}>
                        {value}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="md">
            <Stack gap="md">
              {runInfoLoading ? (
                <Center h={200}>
                  <Loader size="sm" />
                </Center>
              ) : runInfo ? (
                <>
                  <Table withTableBorder withColumnBorders>
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td w={140}>
                          <Text size="sm" fw={600}>
                            State
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            color={
                              runInfo.state === 'running'
                                ? 'green'
                                : runInfo.state === 'waiting'
                                  ? 'yellow'
                                  : 'gray'
                            }
                          >
                            {runInfo.state ?? 'unknown'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            Total Runs
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{runInfo.runs ?? '–'}</Text>
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            Last Exit Code
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{runInfo.lastExitCode ?? '–'}</Text>
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            PID
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{runInfo.pid ?? '–'}</Text>
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>

                  {runInfo.history.length > 0 ? (
                    <>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>
                          Recent Activity (last 24 hours)
                        </Text>
                        <Button
                          size="xs"
                          variant="subtle"
                          leftSection={<IconRefresh size={14} />}
                          onClick={fetchRunInfo}
                        >
                          Refresh
                        </Button>
                      </Group>
                      <Table withTableBorder withColumnBorders striped>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Timestamp</Table.Th>
                            <Table.Th>Event</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {[...runInfo.history].reverse().map((entry, i) => (
                            <Table.Tr key={i}>
                              <Table.Td>
                                <Code>{entry.timestamp}</Code>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">{entry.event}</Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No recent activity found in system log.
                    </Text>
                  )}
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  Click the tab to load run history.
                </Text>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="xml" pt="md">
            <Stack gap="sm">
              <Group justify="flex-end">
                {editingXml ? (
                  <>
                    <Button
                      size="xs"
                      variant="light"
                      color="gray"
                      onClick={() => {
                        setXmlContent(rawXml)
                        setEditingXml(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      leftSection={<IconDeviceFloppy size={14} />}
                      onClick={handleSaveXml}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => setEditingXml(true)}
                  >
                    Edit XML
                  </Button>
                )}
              </Group>
              {editingXml ? (
                <Textarea
                  value={xmlContent}
                  onChange={(e) => setXmlContent(e.currentTarget.value)}
                  autosize
                  minRows={15}
                  maxRows={30}
                  styles={{
                    input: { fontFamily: 'monospace', fontSize: '12px' }
                  }}
                />
              ) : (
                <Code block style={{ fontSize: '12px', maxHeight: 500, overflow: 'auto' }}>
                  {rawXml}
                </Code>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Drawer>
  )
}
