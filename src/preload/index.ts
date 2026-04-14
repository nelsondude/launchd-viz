import { contextBridge, ipcRenderer } from 'electron'

const launchdAPI = {
  listAgents: () => ipcRenderer.invoke('launchd:list'),
  readPlistRaw: (path: string) => ipcRenderer.invoke('launchd:read-raw', path),
  createAgent: (plist: unknown, source: string) =>
    ipcRenderer.invoke('launchd:create', plist, source),
  updateAgent: (path: string, plist: unknown) =>
    ipcRenderer.invoke('launchd:update', path, plist),
  updateAgentRaw: (path: string, xml: string) =>
    ipcRenderer.invoke('launchd:update-raw', path, xml),
  deleteAgent: (path: string, label: string) =>
    ipcRenderer.invoke('launchd:delete', path, label),
  loadAgent: (path: string) => ipcRenderer.invoke('launchd:load', path),
  unloadAgent: (path: string, label: string) =>
    ipcRenderer.invoke('launchd:unload', path, label),
  startAgent: (label: string) => ipcRenderer.invoke('launchd:start', label),
  stopAgent: (label: string) => ipcRenderer.invoke('launchd:stop', label),
  revealInFinder: (path: string) => ipcRenderer.invoke('launchd:reveal', path)
}

contextBridge.exposeInMainWorld('launchd', launchdAPI)
