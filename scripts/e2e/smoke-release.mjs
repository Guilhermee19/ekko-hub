// Smoke test for the RELEASE build: starts target/release/ekko-desktop.exe with the
// WebView2 DevTools port open and checks every window actually rendered the UI.
// Catches production-only breakage (minifier bugs, missing assets) that dev mode hides.
//   npm run tauri build && npm run e2e:smoke-release
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 9335
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const exe = path.join(root, 'target/release/ekko-desktop.exe')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const app = spawn(exe, [], {
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
  stdio: 'ignore',
})

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const timer = setTimeout(() => reject(new Error('timeout')), 5000)
    ws.onopen = () =>
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }))
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data)
      if (d.id !== 1) return
      clearTimeout(timer)
      ws.close()
      resolve(d.result?.result?.value)
    }
  })
}

let failures = 0
try {
  let pages = []
  for (let i = 0; i < 30 && pages.length === 0; i++) {
    await sleep(500)
    pages = await fetch(`http://127.0.0.1:${PORT}/json`)
      .then((r) => r.json())
      .then((ts) => ts.filter((t) => t.type === 'page'))
      .catch(() => [])
  }
  await sleep(2500) // let React mount
  if (pages.length === 0) throw new Error('nenhuma janela do Ekko apareceu')
  // Open the other windows through IPC so they are checked too.
  await evaluate(
    pages[0].webSocketDebuggerUrl,
    `Promise.all([
      window.__TAURI_INTERNALS__.invoke('open_settings'),
      window.__TAURI_INTERNALS__.invoke('toggle_palette'),
      window.__TAURI_INTERNALS__.invoke('show_alarm', { alarm: { id: 'smoke', kind: 'timer', title: 'Teste', detail: 'smoke', firedAt: Date.now() } }),
    ]).then(() => true)`,
  )
  await sleep(3000)
  pages = await fetch(`http://127.0.0.1:${PORT}/json`)
    .then((r) => r.json())
    .then((ts) => ts.filter((t) => t.type === 'page'))
  for (const page of pages) {
    const info = await evaluate(
      page.webSocketDebuggerUrl,
      `({ label: window.__TAURI_INTERNALS__?.metadata.currentWindow.label, kids: document.getElementById('root')?.childElementCount ?? 0 })`,
    )
    const ok = info && info.kids > 0
    if (!ok) failures++
    console.log(`${ok ? 'ok   ' : 'FALHA'} janela ${info?.label ?? '?'}: ${info?.kids ?? 0} elemento(s) no #root`)
  }
} catch (err) {
  failures++
  console.log('FALHA', err.message)
} finally {
  app.kill()
}
console.log(failures === 0 ? 'PASSOU' : 'FALHOU')
setTimeout(() => process.exit(failures === 0 ? 0 : 1), 200)
