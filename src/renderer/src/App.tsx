import { useState, useCallback } from 'react'
import {
  AppShell,
  Group,
  Title,
  ActionIcon,
  Tooltip,
  Button,
  Text,
  useMantineColorScheme
} from '@mantine/core'
import { IconRefresh, IconPlus, IconSun, IconMoon } from '@tabler/icons-react'
import type { AgentInfo } from '../../shared/types'
import { AgentList } from './components/AgentList'
import { AgentDetail } from './components/AgentDetail'
import { AgentForm } from './components/AgentForm'

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [formOpened, setFormOpened] = useState(false)
  const [editAgent, setEditAgent] = useState<AgentInfo | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleEdit = (agent: AgentInfo) => {
    setEditAgent(agent)
    setFormOpened(true)
    setSelectedAgent(null)
  }

  const handleCloseForm = () => {
    setFormOpened(false)
    setEditAgent(null)
  }

  return (
    <AppShell header={{ height: 52 }} padding="md">
      <AppShell.Header
        px="md"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          WebkitAppRegion: 'drag'
        }}
      >
        <Group gap="sm" style={{ WebkitAppRegion: 'no-drag', paddingLeft: 72 }}>
          <Title order={4}>launchd-viz</Title>
          <Text size="xs" c="dimmed">
            Launch Agent & Daemon Manager
          </Text>
        </Group>
        <Group gap="xs" style={{ WebkitAppRegion: 'no-drag' }}>
          <Tooltip label="Toggle theme">
            <ActionIcon variant="subtle" onClick={toggleColorScheme}>
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refresh">
            <ActionIcon variant="subtle" onClick={refetch}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              setEditAgent(null)
              setFormOpened(true)
            }}
          >
            New Agent
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <AgentList onSelect={setSelectedAgent} refreshTrigger={refreshKey} />
      </AppShell.Main>

      <AgentDetail
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onEdit={handleEdit}
        onRefetch={refetch}
      />

      <AgentForm
        opened={formOpened}
        onClose={handleCloseForm}
        onRefetch={refetch}
        editAgent={editAgent}
      />
    </AppShell>
  )
}
