import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Window APIs called from the frontend need a matching `core:window:allow-*` permission,
// or Tauri silently rejects them (the settings "Fechar" button did nothing).
// `onFocusChanged` is an event listener (covered by core:default), not a command.
const ALWAYS_ALLOWED = new Set(['onFocusChanged', 'onMoved', 'onResized', 'label'])

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) && !name.includes('.test.') ? [path] : []
  })
}

describe('tauri capabilities', () => {
  it('every window method used by the UI is allowed', () => {
    const root = join(__dirname, '..', '..')
    const capability = JSON.parse(
      readFileSync(join(root, '..', 'src-tauri', 'capabilities', 'default.json'), 'utf8'),
    ) as { permissions: string[] }
    const used = new Set<string>()
    for (const file of sources(root)) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/(?:getCurrentWindow\(\)|win\(\))\.([a-zA-Z]+)\(/g))
        used.add(m[1])
    }
    const missing = [...used]
      .filter((method) => !ALWAYS_ALLOWED.has(method))
      .filter((method) => !capability.permissions.includes(`core:window:allow-${kebab(method)}`))
    expect(missing).toEqual([])
  })
})
