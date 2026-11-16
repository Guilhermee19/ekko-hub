import type {
  GeneralBackend,
  GeneralSettings,
  ShortcutAction,
  ShortcutReport,
  ShortcutSettings,
} from './generalTypes'

// Gallery stand-in: saves into the mock settings; no OS effects, no real hotkeys.

interface Deps {
  general: () => GeneralSettings
  shortcuts: () => ShortcutSettings
  patch: (change: { general?: GeneralSettings; shortcuts?: ShortcutSettings }) => Promise<void>
}

/** Same rule as the backend: Ctrl/Alt/Win required, except F-keys. */
const valid = (combo: string) =>
  /^F([1-9]|1\d|2[0-4])$/i.test(combo.split('+').pop() ?? '') || /(Ctrl|Alt|Win)\+/i.test(combo)

function reports(shortcuts: ShortcutSettings): ShortcutReport[] {
  const seen = new Set<string>()
  return (Object.keys(shortcuts) as ShortcutAction[]).map((action) => {
    const combo = shortcuts[action]
    const key = combo.toLowerCase()
    const pending = action !== 'summon' && action !== 'palette'
    const status = !valid(combo) ? 'invalid' : pending ? 'pending' : seen.has(key) ? 'taken' : 'ok'
    seen.add(key)
    return { action, status, active: status === 'ok' ? combo : null }
  })
}

export function mockGeneral(deps: Deps): GeneralBackend {
  return {
    setAutostart: async (autostart) => {
      await deps.patch({ general: { ...deps.general(), autostart } })
      return autostart
    },
    setGeneral: (general) =>
      deps.patch({ general: { ...general, autostart: deps.general().autostart } }),
    setShortcuts: async (shortcuts) => {
      await deps.patch({ shortcuts })
      return reports(shortcuts)
    },
    shortcutStatus: () => Promise.resolve(reports(deps.shortcuts())),
  }
}
