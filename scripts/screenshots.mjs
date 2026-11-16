// Captures the README screenshots from the browser gallery (mock data, fake desktop),
// so no personal data from a real desktop ends up in the repo.
//   1. npx vite --open false              (from apps/desktop, gallery on 127.0.0.1:1420)
//   2. msedge --headless=new --remote-debugging-port=9400 --user-data-dir=<tmp>
//   3. node scripts/screenshots.mjs        → docs/screenshots/*.webp
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CDP = Number(process.env.CDP_PORT ?? 9400)
const GALLERY = process.env.GALLERY_URL ?? 'http://127.0.0.1:1420/'
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/screenshots')
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const target = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let seq = 0
const pending = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d)
    pending.delete(d.id)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, (d) => (d.error ? reject(new Error(`${method}: ${d.error.message}`)) : resolve(d.result)))
    ws.send(JSON.stringify({ id, method, params }))
  })
const js = async (expression) =>
  (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 1000, deviceScaleFactor: 2, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })

async function open(url = GALLERY) {
  await send('Page.navigate', { url })
  await sleep(1500)
}

/** Clicks the first button whose visible text starts with `text` (optionally inside `scope`). */
async function click(text, scope = 'document') {
  const ok = await js(`(() => {
    const b = [...${scope}.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}))
    if (!b) return false
    b.click()
    return true
  })()`)
  if (!ok) throw new Error(`botão não encontrado: ${text}`)
  await sleep(500)
}

async function rectOf(selector) {
  return js(`(() => {
    const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect()
    return r && { x: r.x, y: r.y, width: r.width, height: r.height }
  })()`)
}

async function hover(selector) {
  const r = await rectOf(selector)
  if (!r) throw new Error(`sem elemento: ${selector}`)
  const x = r.x + r.width / 2
  const y = r.y + Math.min(12, r.height / 2)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await sleep(900)
}

async function shot(name, clip) {
  // WebP at 2× keeps text crisp and the repo light (PNG was ~10 MB for the set).
  const params = { format: 'webp', quality: 88, captureBeyondViewport: false }
  if (clip) params.clip = { ...clip, scale: 1 }
  const { data } = await send('Page.captureScreenshot', params)
  writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(data, 'base64'))
  console.log('✓', name)
}

const DESKTOP = 'div[style*="width: 1280px"]'
const desktop = () => rectOf(DESKTOP)
/** Top strip of the fake desktop: the notch pill. */
const pillStrip = async () => {
  const d = await desktop()
  return { x: d.x + d.width / 2 - 260, y: d.y, width: 520, height: 64 }
}
const NOTCH = `${DESKTOP} .notch-pill, ${DESKTOP} [class*="rounded-b-"]`

// 1. Hero: notch opened on the Home panel.
await open()
await click('Notch no topo')
await hover(NOTCH)
await shot('notch-home', await desktop())

// 1b. Meu PC inside the notch panel.
await open()
await click('Notch no topo')
await hover(NOTCH)
await click('Meu PC', `document.querySelector('${DESKTOP}')`)
await sleep(1500)
await shot('mypc', await desktop())

// 2. Pill states.
await open()
await click('Timer')
await shot('pill-timer', await pillStrip())
await click('Música')
await shot('pill-music', await pillStrip())
await click('Ouvindo')
await shot('pill-listening', await pillStrip())
await click('Repouso')

// 3. Personas / custom look on the expanded notch.
await open()
await click('Ultron')
await hover(NOTCH)
await shot('theme-ultron', await desktop())
await open()
await click('Eco')
await click('Central (HUD)')
await shot('mode-hub', await desktop())
await click('Ekko')

// 4. Tray flyout (next to the clock).
await open()
await click('Bandeja')
await js(`document.querySelector('${DESKTOP} [aria-label*="Ekko"], ${DESKTOP} button[title*="Ekko"]')?.click()`)
await sleep(700)
await shot('mode-tray', await desktop())

// 5. Settings.
await open()
await click('Configurações')
const settingsBox = 'div[class*="h-[680px]"]'
await shot('settings-appearance', await rectOf(settingsBox))
await click('Conexões', `document.querySelector('${settingsBox}')`)
await shot('settings-connections', await rectOf(settingsBox))

// 6. Flows: palette, alarm, onboarding.
await open()
await click('Paleta')
await js(`(() => { const i = document.querySelector('input[placeholder]'); if (i) { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(i, 'timer'); i.dispatchEvent(new Event('input', { bubbles: true })) } })()`)
await sleep(500)
await shot('palette', await desktop())
await open()
await click('Alarme')
await sleep(400)
await shot('alarm', await desktop())
await open()
await click('Boas-vindas')
await sleep(600)
await shot('onboarding', await rectOf('div[class*="h-[560px]"]'))

ws.close()
await fetch(`http://127.0.0.1:${CDP}/json/close/${target.id}`).catch(() => {})
setTimeout(() => process.exit(0), 200)
