import type { LaunchdPlist } from '../../../shared/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

function formatInterval(seconds: number): string {
  if (seconds < 60) return `Every ${seconds}s`
  if (seconds < 3600) {
    const m = Math.round(seconds / 60)
    return `Every ${m} min`
  }
  if (seconds < 86400) {
    const h = seconds / 3600
    return h === Math.floor(h) ? `Every ${h} hr` : `Every ${h.toFixed(1)} hr`
  }
  const d = seconds / 86400
  return d === Math.floor(d) ? `Every ${d} day${d > 1 ? 's' : ''}` : `Every ${d.toFixed(1)} days`
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatCalendarEntry(entry: Record<string, number>): string {
  const parts: string[] = []

  if (entry.Month != null) {
    parts.push(MONTHS[entry.Month - 1] ?? `M${entry.Month}`)
  }
  if (entry.Day != null) {
    parts.push(`${entry.Day}${ordinal(entry.Day)}`)
  }
  if (entry.Weekday != null) {
    parts.push(WEEKDAYS[entry.Weekday] ?? `D${entry.Weekday}`)
  }

  const hour = entry.Hour ?? 0
  const minute = entry.Minute ?? 0
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  parts.push(`${h12}:${pad2(minute)} ${ampm}`)

  if (parts.length === 1) {
    // Only time, meaning daily
    return `Daily ${parts[0]}`
  }
  return parts.join(' ')
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export function formatSchedule(plist: LaunchdPlist): string {
  if (plist.StartInterval != null) {
    return formatInterval(plist.StartInterval)
  }

  if (plist.StartCalendarInterval) {
    const entries = Array.isArray(plist.StartCalendarInterval)
      ? plist.StartCalendarInterval
      : [plist.StartCalendarInterval]

    if (entries.length === 1) {
      return formatCalendarEntry(entries[0])
    }
    // Multiple entries - show first + count
    return `${formatCalendarEntry(entries[0])} +${entries.length - 1} more`
  }

  if (plist.RunAtLoad) {
    return 'On load'
  }

  if (plist.KeepAlive) {
    return 'Keep alive'
  }

  if (plist.WatchPaths || (plist as Record<string, unknown>).QueueDirectories) {
    return 'On file change'
  }

  return 'Manual'
}

export function scheduleTooltip(plist: LaunchdPlist): string | null {
  const lines: string[] = []

  if (plist.StartInterval != null) {
    lines.push(`StartInterval: ${plist.StartInterval}s`)
  }

  if (plist.StartCalendarInterval) {
    const entries = Array.isArray(plist.StartCalendarInterval)
      ? plist.StartCalendarInterval
      : [plist.StartCalendarInterval]
    for (const entry of entries) {
      lines.push(formatCalendarEntry(entry))
    }
  }

  if (plist.RunAtLoad) lines.push('RunAtLoad: Yes')
  if (plist.KeepAlive) {
    lines.push(
      typeof plist.KeepAlive === 'object'
        ? `KeepAlive: ${JSON.stringify(plist.KeepAlive)}`
        : 'KeepAlive: Yes'
    )
  }

  if (plist.WatchPaths) {
    const paths = plist.WatchPaths as string[]
    lines.push(`WatchPaths: ${Array.isArray(paths) ? paths.join(', ') : String(paths)}`)
  }

  return lines.length > 0 ? lines.join('\n') : null
}
