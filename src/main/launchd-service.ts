import { execSync } from 'child_process'
import { readFileSync, writeFileSync, unlinkSync, readdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'
import type { AgentInfo, AgentSource, AgentStatus, LaunchdPlist } from '../shared/types'

const DIRECTORIES: Record<AgentSource, string> = {
  'user-agents': join(homedir(), 'Library/LaunchAgents'),
  'system-agents': '/Library/LaunchAgents',
  'system-daemons': '/Library/LaunchDaemons'
}

function getUid(): string {
  return execSync('id -u', { encoding: 'utf8' }).trim()
}

function isSystemPath(path: string): boolean {
  return path.startsWith('/Library/')
}

function runCommand(cmd: string, sudo = false): string {
  if (sudo) {
    const escaped = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return execSync(
      `osascript -e 'do shell script "${escaped}" with administrator privileges'`,
      { encoding: 'utf8', timeout: 30000 }
    )
  }
  return execSync(cmd, { encoding: 'utf8', timeout: 30000 })
}

function parsePlistFile(path: string): LaunchdPlist | null {
  try {
    const json = execSync(`plutil -convert json -o - "${path}"`, {
      encoding: 'utf8',
      timeout: 5000
    })
    return JSON.parse(json) as LaunchdPlist
  } catch {
    return null
  }
}

function readPlistXml(path: string): string {
  try {
    return execSync(`plutil -convert xml1 -o - "${path}"`, {
      encoding: 'utf8',
      timeout: 5000
    })
  } catch {
    return readFileSync(path, 'utf8')
  }
}

function getLoadedServices(): Map<string, AgentStatus> {
  const map = new Map<string, AgentStatus>()
  try {
    const output = execSync('launchctl list', { encoding: 'utf8', timeout: 10000 })
    const lines = output.trim().split('\n').slice(1) // skip header
    for (const line of lines) {
      const parts = line.split('\t')
      if (parts.length >= 3) {
        const pid = parts[0].trim() === '-' ? null : parseInt(parts[0].trim(), 10)
        const status = parts[1].trim() === '-' ? null : parseInt(parts[1].trim(), 10)
        const label = parts[2].trim()
        map.set(label, { pid, lastExitStatus: status, label })
      }
    }
  } catch {
    // ignore - may fail for system services
  }
  return map
}

function getPlistFiles(dir: string): string[] {
  try {
    if (!existsSync(dir)) return []
    return readdirSync(dir)
      .filter((f) => f.endsWith('.plist'))
      .map((f) => join(dir, f))
  } catch {
    return []
  }
}

export function listAgents(): AgentInfo[] {
  const loadedServices = getLoadedServices()
  const agents: AgentInfo[] = []

  for (const [source, dir] of Object.entries(DIRECTORIES) as [AgentSource, string][]) {
    const files = getPlistFiles(dir)
    for (const plistPath of files) {
      const plist = parsePlistFile(plistPath)
      if (!plist || !plist.Label) continue

      const status = loadedServices.get(plist.Label) ?? null
      agents.push({
        label: plist.Label,
        source,
        plistPath,
        plist,
        status,
        isLoaded: status !== null
      })
    }
  }

  return agents.sort((a, b) => a.label.localeCompare(b.label))
}

export function readPlistRaw(path: string): string {
  return readPlistXml(path)
}

export function createAgent(
  plist: LaunchdPlist,
  source: AgentSource
): { path: string } {
  const dir = DIRECTORIES[source]
  const filename = `${plist.Label}.plist`
  const fullPath = join(dir, filename)

  if (existsSync(fullPath)) {
    throw new Error(`Plist already exists at ${fullPath}`)
  }

  // Write as JSON then convert to XML plist
  const tmpPath = `/tmp/launchd-viz-${Date.now()}.json`
  writeFileSync(tmpPath, JSON.stringify(plist))

  try {
    if (isSystemPath(fullPath)) {
      runCommand(`cp "${tmpPath}" "${fullPath}" && plutil -convert xml1 "${fullPath}"`, true)
    } else {
      execSync(`cp "${tmpPath}" "${fullPath}" && plutil -convert xml1 "${fullPath}"`, {
        encoding: 'utf8'
      })
    }
  } finally {
    try {
      unlinkSync(tmpPath)
    } catch {
      // ignore
    }
  }

  return { path: fullPath }
}

export function updateAgent(path: string, plist: LaunchdPlist): void {
  const tmpPath = `/tmp/launchd-viz-${Date.now()}.json`
  writeFileSync(tmpPath, JSON.stringify(plist))

  try {
    if (isSystemPath(path)) {
      runCommand(`cp "${tmpPath}" "${path}" && plutil -convert xml1 "${path}"`, true)
    } else {
      execSync(`cp "${tmpPath}" "${path}" && plutil -convert xml1 "${path}"`, {
        encoding: 'utf8'
      })
    }
  } finally {
    try {
      unlinkSync(tmpPath)
    } catch {
      // ignore
    }
  }
}

export function updateAgentRaw(path: string, xml: string): void {
  const tmpPath = `/tmp/launchd-viz-${Date.now()}.plist`
  writeFileSync(tmpPath, xml)

  // Validate
  try {
    execSync(`plutil -lint "${tmpPath}"`, { encoding: 'utf8' })
  } catch (e) {
    unlinkSync(tmpPath)
    throw new Error(`Invalid plist XML: ${(e as Error).message}`)
  }

  if (isSystemPath(path)) {
    runCommand(`cp "${tmpPath}" "${path}"`, true)
  } else {
    const content = readFileSync(tmpPath, 'utf8')
    writeFileSync(path, content)
  }
  unlinkSync(tmpPath)
}

export function deleteAgent(path: string, label: string): void {
  // Try to unload first
  try {
    unloadAgent(path, label)
  } catch {
    // ignore - may not be loaded
  }

  if (isSystemPath(path)) {
    runCommand(`rm "${path}"`, true)
  } else {
    unlinkSync(path)
  }
}

export function loadAgent(path: string): void {
  const uid = getUid()
  const needsSudo = isSystemPath(path)
  const absPath = resolve(path)

  try {
    runCommand(`launchctl bootstrap gui/${uid} "${absPath}"`, needsSudo)
  } catch {
    // Fall back to legacy command
    runCommand(`launchctl load "${absPath}"`, needsSudo)
  }
}

export function unloadAgent(path: string, label: string): void {
  const uid = getUid()
  const needsSudo = isSystemPath(path)

  try {
    runCommand(`launchctl bootout gui/${uid}/${label}`, needsSudo)
  } catch {
    // Fall back to legacy command
    const absPath = resolve(path)
    runCommand(`launchctl unload "${absPath}"`, needsSudo)
  }
}

export function startAgent(label: string): void {
  const uid = getUid()
  try {
    runCommand(`launchctl kickstart gui/${uid}/${label}`)
  } catch {
    runCommand(`launchctl start ${label}`)
  }
}

export function stopAgent(label: string): void {
  const uid = getUid()
  try {
    runCommand(`launchctl kill SIGTERM gui/${uid}/${label}`)
  } catch {
    runCommand(`launchctl stop ${label}`)
  }
}
