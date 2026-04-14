export type AgentSource = 'user-agents' | 'system-agents' | 'system-daemons'

export interface LaunchdPlist {
  Label: string
  ProgramArguments?: string[]
  Program?: string
  RunAtLoad?: boolean
  KeepAlive?: boolean | Record<string, boolean>
  StartInterval?: number
  StartCalendarInterval?: Record<string, number> | Record<string, number>[]
  StandardOutPath?: string
  StandardErrorPath?: string
  EnvironmentVariables?: Record<string, string>
  WorkingDirectory?: string
  UserName?: string
  GroupName?: string
  Disabled?: boolean
  [key: string]: unknown
}

export interface AgentStatus {
  pid: number | null
  lastExitStatus: number | null
  label: string
}

export interface AgentInfo {
  label: string
  source: AgentSource
  plistPath: string
  plist: LaunchdPlist
  status: AgentStatus | null
  isLoaded: boolean
}

export interface RunHistoryEntry {
  timestamp: string
  event: string
}

export interface ServiceRunInfo {
  state: string | null
  runs: number | null
  lastExitCode: string | null
  pid: number | null
  history: RunHistoryEntry[]
}

export interface LaunchdAPI {
  listAgents(): Promise<AgentInfo[]>
  readPlistRaw(path: string): Promise<string>
  createAgent(plist: LaunchdPlist, source: AgentSource): Promise<{ path: string }>
  updateAgent(path: string, plist: LaunchdPlist): Promise<void>
  updateAgentRaw(path: string, xml: string): Promise<void>
  deleteAgent(path: string, label: string): Promise<void>
  loadAgent(path: string): Promise<void>
  unloadAgent(path: string, label: string): Promise<void>
  startAgent(label: string): Promise<void>
  stopAgent(label: string): Promise<void>
  revealInFinder(path: string): Promise<void>
  getServiceRunInfo(label: string): Promise<ServiceRunInfo>
}
