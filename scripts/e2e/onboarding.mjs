// E2E: drives the real onboarding window through WebView2's DevTools port.
// Run the app with the port open, then this script (see README "Testes de ponta a ponta"):
//   WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333 npm run tauri dev
//   npm run e2e:onboarding
// The onboarding window must be showing (settings `onboarded: false`, or "Refazer boas-vindas").
// Picks "Bolha flutuante" (creates a new window: the case that used to deadlock),
// finishes, then checks settings + window state through IPC from another window.
const PORT = Number(process.env.EKKO_CDP_PORT ?? 9333)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`)
  return res.json()
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const ready = new Promise((r) => (ws.onopen = r))
  const evaluate = async (expression, timeoutMs = 8000) => {
    await ready
    const myId = ++id
    const reply = new Promise((resolve, reject) => {
      pending.set(myId, resolve)
      setTimeout(() => reject(new Error(`timeout (${timeoutMs} ms) — app travado? ${expression.slice(0, 60)}`)), timeoutMs)
    })
    ws.send(JSON.stringify({ id: myId, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
    const msg = await reply
    if (msg.result?.exceptionDetails) throw new Error(JSON.stringify(msg.result.exceptionDetails))
    return msg.result?.result?.value
  }
  return { evaluate, close: () => ws.close() }
}

const clickText = (text) => `(() => {
  const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}) && !b.disabled)
  if (!el) return 'missing: ' + ${JSON.stringify(text)} + ' | ' + [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).join(' / ')
  el.click(); return 'ok'
})()`

const stepTitle = `document.querySelector('[aria-current="step"]')?.textContent`

async function byLabel(label) {
  for (const t of await targets()) {
    if (t.type !== 'page' || !/(localhost|127.0.0.1):1420/.test(t.url)) continue
    const c = connect(t.webSocketDebuggerUrl)
    const l = await c.evaluate('window.__TAURI_INTERNALS__.metadata.currentWindow.label').catch(() => null)
    if (l === label) return c
    c.close()
  }
  throw new Error('janela não encontrada: ' + label)
}
const page = await byLabel('onboarding')
const log = (...a) => console.log('·', ...a)

log('etapa', await page.evaluate(stepTitle))
for (const label of ['Vamos lá', 'Continuar', 'Continuar']) {
  log(label, await page.evaluate(clickText(label)))
  await sleep(400)
  log('etapa', await page.evaluate(stepTitle))
}
// Voice step: skip the mic test.
log('Pular', await page.evaluate(clickText('Pular')))
await sleep(400)
log('etapa', await page.evaluate(stepTitle))
// Appearance: pick the floating bubble (creates the orb window).
log('Bolha', await page.evaluate(clickText('Bolha flutuante')))
await sleep(1500)
log('ainda responde?', await page.evaluate('1 + 1', 4000))
log('Continuar', await page.evaluate(clickText('Continuar')))
await sleep(400)
log('etapa', await page.evaluate(stepTitle))
log('Começar', await page.evaluate(clickText('Começar')))
await sleep(1500)

// Check through IPC from the notch window (alive in every mode).
const probe = await byLabel('notch')
const settings = await probe.evaluate(`window.__TAURI_INTERNALS__.invoke('get_settings')`)
log('settings', JSON.stringify({ onboarded: settings.onboarded, displayMode: settings.displayMode }))
const ok = settings.onboarded === true && settings.displayMode === 'orb'
console.log(ok ? 'PASSOU' : 'FALHOU')
page.close()
probe.close()
// Let the sockets close before exiting (avoids a libuv assert on Windows).
setTimeout(() => process.exit(ok ? 0 : 1), 200)
