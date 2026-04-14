import type { AgentInfo, AgentSource, LaunchdPlist, ServiceRunInfo } from '../shared/types'

interface IpcResult<T> {
  data?: T
  error?: string
}

interface LaunchdBridge {
  listAgents(): Promise<IpcResult<AgentInfo[]>>
  readPlistRaw(path: string): Promise<IpcResult<string>>
  createAgent(plist: LaunchdPlist, source: AgentSource): Promise<IpcResult<{ path: string }>>
  updateAgent(path: string, plist: LaunchdPlist): Promise<IpcResult<boolean>>
  updateAgentRaw(path: string, xml: string): Promise<IpcResult<boolean>>
  deleteAgent(path: string, label: string): Promise<IpcResult<boolean>>
  loadAgent(path: string): Promise<IpcResult<boolean>>
  unloadAgent(path: string, label: string): Promise<IpcResult<boolean>>
  startAgent(label: string): Promise<IpcResult<boolean>>
  stopAgent(label: string): Promise<IpcResult<boolean>>
  revealInFinder(path: string): Promise<IpcResult<boolean>>
  getServiceRunInfo(label: string): Promise<IpcResult<ServiceRunInfo>>
}

declare global {
  interface Window {
    launchd: LaunchdBridge
  }
}
