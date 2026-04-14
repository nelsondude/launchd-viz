import { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  Switch,
  NumberInput,
  Textarea,
  Button,
  Group,
  Select,
  ActionIcon,
  Text
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import type { AgentInfo, AgentSource, LaunchdPlist } from '../../../shared/types'

interface AgentFormProps {
  opened: boolean
  onClose: () => void
  onRefetch: () => void
  editAgent?: AgentInfo | null
}

interface FormValues {
  Label: string
  ProgramArguments: string
  RunAtLoad: boolean
  KeepAlive: boolean
  StartInterval: number | ''
  StandardOutPath: string
  StandardErrorPath: string
  WorkingDirectory: string
  envVars: { key: string; value: string }[]
  source: AgentSource
}

function plistToForm(agent: AgentInfo): FormValues {
  const p = agent.plist
  return {
    Label: p.Label,
    ProgramArguments: p.ProgramArguments?.join('\n') ?? p.Program ?? '',
    RunAtLoad: p.RunAtLoad ?? false,
    KeepAlive: p.KeepAlive === true,
    StartInterval: p.StartInterval ?? '',
    StandardOutPath: p.StandardOutPath ?? '',
    StandardErrorPath: p.StandardErrorPath ?? '',
    WorkingDirectory: p.WorkingDirectory ?? '',
    envVars: p.EnvironmentVariables
      ? Object.entries(p.EnvironmentVariables).map(([key, value]) => ({ key, value }))
      : [],
    source: agent.source
  }
}

function formToPlist(values: FormValues): LaunchdPlist {
  const plist: LaunchdPlist = {
    Label: values.Label
  }

  const args = values.ProgramArguments.split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  if (args.length > 0) {
    plist.ProgramArguments = args
  }

  if (values.RunAtLoad) plist.RunAtLoad = true
  if (values.KeepAlive) plist.KeepAlive = true
  if (values.StartInterval) plist.StartInterval = Number(values.StartInterval)
  if (values.StandardOutPath) plist.StandardOutPath = values.StandardOutPath
  if (values.StandardErrorPath) plist.StandardErrorPath = values.StandardErrorPath
  if (values.WorkingDirectory) plist.WorkingDirectory = values.WorkingDirectory

  const envVars = values.envVars.filter((v) => v.key && v.value)
  if (envVars.length > 0) {
    plist.EnvironmentVariables = Object.fromEntries(envVars.map((v) => [v.key, v.value]))
  }

  return plist
}

const EMPTY_VALUES: FormValues = {
  Label: '',
  ProgramArguments: '',
  RunAtLoad: false,
  KeepAlive: false,
  StartInterval: '',
  StandardOutPath: '',
  StandardErrorPath: '',
  WorkingDirectory: '',
  envVars: [],
  source: 'user-agents' as AgentSource
}

export function AgentForm({ opened, onClose, onRefetch, editAgent }: AgentFormProps) {
  const isEdit = !!editAgent

  const form = useForm<FormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      Label: (v) => (!v ? 'Label is required' : null),
      ProgramArguments: (v) => (!v.trim() ? 'At least one program argument is required' : null)
    }
  })

  // Reinitialize form when editAgent changes or modal opens
  useEffect(() => {
    if (opened) {
      if (editAgent) {
        form.initialize(plistToForm(editAgent))
      } else {
        form.initialize(EMPTY_VALUES)
      }
    }
  }, [opened, editAgent])

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      const plist = formToPlist(values)

      if (isEdit && editAgent) {
        const result = await window.launchd.updateAgent(editAgent.plistPath, plist)
        if (result.error) {
          notifications.show({ title: 'Error', message: result.error, color: 'red' })
          return
        }
        notifications.show({
          title: 'Updated',
          message: `${plist.Label} updated`,
          color: 'green'
        })
      } else {
        const result = await window.launchd.createAgent(plist, values.source)
        if (result.error) {
          notifications.show({ title: 'Error', message: result.error, color: 'red' })
          return
        }
        notifications.show({
          title: 'Created',
          message: `${plist.Label} created at ${result.data?.path}`,
          color: 'green'
        })
      }

      onRefetch()
      onClose()
    } catch (e) {
      notifications.show({ title: 'Error', message: (e as Error).message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit ${editAgent?.label}` : 'New Launch Agent'}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Label"
            placeholder="com.example.myagent"
            description="Unique reverse-domain identifier"
            required
            disabled={isEdit}
            {...form.getInputProps('Label')}
          />

          {!isEdit && (
            <Select
              label="Destination"
              data={[
                { value: 'user-agents', label: '~/Library/LaunchAgents (User)' },
                { value: 'system-agents', label: '/Library/LaunchAgents (System)' },
                { value: 'system-daemons', label: '/Library/LaunchDaemons (System)' }
              ]}
              {...form.getInputProps('source')}
            />
          )}

          <Textarea
            label="Program Arguments"
            placeholder={'/bin/bash\n-c\necho "hello"'}
            description="One argument per line. First line is the executable."
            autosize
            minRows={3}
            maxRows={8}
            styles={{ input: { fontFamily: 'monospace', fontSize: '13px' } }}
            required
            {...form.getInputProps('ProgramArguments')}
          />

          <Group>
            <Switch label="Run at Load" {...form.getInputProps('RunAtLoad', { type: 'checkbox' })} />
            <Switch label="Keep Alive" {...form.getInputProps('KeepAlive', { type: 'checkbox' })} />
          </Group>

          <NumberInput
            label="Start Interval (seconds)"
            placeholder="e.g. 300 for every 5 minutes"
            min={0}
            {...form.getInputProps('StartInterval')}
          />

          <TextInput
            label="Working Directory"
            placeholder="/Users/you/project"
            {...form.getInputProps('WorkingDirectory')}
          />

          <TextInput
            label="Standard Out Path"
            placeholder="/tmp/myagent.stdout.log"
            {...form.getInputProps('StandardOutPath')}
          />

          <TextInput
            label="Standard Error Path"
            placeholder="/tmp/myagent.stderr.log"
            {...form.getInputProps('StandardErrorPath')}
          />

          {/* Environment Variables */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Environment Variables
              </Text>
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() =>
                  form.insertListItem('envVars', { key: '', value: '' })
                }
              >
                <IconPlus size={14} />
              </ActionIcon>
            </Group>
            {form.values.envVars.map((_, index) => (
              <Group key={index} gap="xs">
                <TextInput
                  placeholder="KEY"
                  style={{ flex: 1 }}
                  styles={{ input: { fontFamily: 'monospace' } }}
                  {...form.getInputProps(`envVars.${index}.key`)}
                />
                <TextInput
                  placeholder="value"
                  style={{ flex: 2 }}
                  styles={{ input: { fontFamily: 'monospace' } }}
                  {...form.getInputProps(`envVars.${index}.value`)}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  size="sm"
                  onClick={() => form.removeListItem('envVars', index)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Agent'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
