// Drives the browser gallery over the Chrome DevTools Protocol, for the README
// screenshots and animations. Mock data and a fake desktop: nothing personal leaks.
//   1. npx vite --open false              (from apps/desktop, gallery on 127.0.0.1:1420)
//   2. msedge --headless=new --remote-debugging-port=9400 --user-data-dir=<tmp>
//   3. node scripts/screenshots.mjs | node scripts/animations.mjs

const CDP = Number(process.env.CDP_PORT ?? 9400);
const GALLERY = process.env.GALLERY_URL ?? "http://127.0.0.1:1420/";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The fake desktop in the gallery and its notch. */
export const DESKTOP = 'div[style*="width: 1280px"]';
export const NOTCH = `${DESKTOP} .notch-pill, ${DESKTOP} [class*="rounded-b-"]`;

/** Opens a tab; `reduceMotion` freezes animations for crisp stills. */
export async function connect({ reduceMotion = true } = {}) {
  const target = await (
    await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, {
      method: "PUT",
    })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (d) =>
        d.error
          ? reject(new Error(`${method}: ${d.error.message}`))
          : resolve(d.result),
      );
      ws.send(JSON.stringify({ id, method, params }));
    });
  const js = async (expression) =>
    (
      await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
    ).result?.value;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1360,
    height: 1000,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: reduceMotion ? "reduce" : "no-preference",
      },
    ],
  });

  const page = {
    send,
    js,
    async open(url = GALLERY) {
      await send("Page.navigate", { url });
      // The first load waits for Vite to bundle; poll until the gallery has rendered.
      for (let i = 0; i < 60; i++) {
        await sleep(500);
        if (
          await js(`document.querySelectorAll('button').length > 5`).catch(
            () => false,
          )
        )
          break;
      }
      await sleep(800);
    },
    /** Clicks the first button whose visible text starts with `text`. */
    async click(text, scope = "document") {
      const ok = await js(`(() => {
        const b = [...${scope}.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}))
        if (!b) return false
        b.click()
        return true
      })()`);
      if (!ok) throw new Error(`botão não encontrado: ${text}`);
      await sleep(500);
    },
    rectOf(selector) {
      return js(`(() => {
        const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect()
        return r && { x: r.x, y: r.y, width: r.width, height: r.height }
      })()`);
    },
    async hover(selector) {
      const r = await page.rectOf(selector);
      if (!r) throw new Error(`sem elemento: ${selector}`);
      await page.mouse(r.x + r.width / 2, r.y + Math.min(12, r.height / 2));
      await sleep(900);
    },
    mouse: (x, y) =>
      send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }),
    async close() {
      ws.close();
      await fetch(`http://127.0.0.1:${CDP}/json/close/${target.id}`).catch(
        () => {},
      );
    },
  };
  return page;
}
