// Captures the README screenshots from the browser gallery (setup in scripts/cdp.mjs).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect, DESKTOP, NOTCH, sleep } from "./cdp.mjs";

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../docs/screenshots",
);
mkdirSync(OUT, { recursive: true });

const { send, js, open, click, rectOf, hover, close } = await connect();

async function shot(name, clip) {
  // WebP at 2× keeps text crisp and the repo light (PNG was ~10 MB for the set).
  const params = { format: "webp", quality: 88, captureBeyondViewport: false };
  if (clip) params.clip = { ...clip, scale: 1 };
  const { data } = await send("Page.captureScreenshot", params);
  writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(data, "base64"));
  console.log("✓", name);
}

const desktop = () => rectOf(DESKTOP);
/** Top strip of the fake desktop: the notch pill. */
const pillStrip = async () => {
  const d = await desktop();
  return { x: d.x + d.width / 2 - 260, y: d.y, width: 520, height: 64 };
};

// 1. Hero: notch opened on the Home panel.
await open();
await click("Notch no topo");
await hover(NOTCH);
await shot("notch-home", await desktop());

// 1b. Meu PC inside the notch panel.
await open();
await click("Notch no topo");
await hover(NOTCH);
await click("Meu PC", `document.querySelector('${DESKTOP}')`);
await sleep(1500);
await shot("mypc", await desktop());

// 2. Pill states.
await open();
await click("Timer");
await shot("pill-timer", await pillStrip());
await click("Música");
await shot("pill-music", await pillStrip());
await click("Ouvindo");
await shot("pill-listening", await pillStrip());
await click("Repouso");

// 3. Personas / custom look on the expanded notch.
await open();
await click("Ultron");
await hover(NOTCH);
await shot("theme-ultron", await desktop());
await open();
await click("Tobby");
await click("Central (HUD)");
await shot("mode-hub", await desktop());
await click("Ekko");

// 4. Tray flyout (next to the clock).
await open();
await click("Bandeja");
await js(
  `document.querySelector('${DESKTOP} [aria-label*="Ekko"], ${DESKTOP} button[title*="Ekko"]')?.click()`,
);
await sleep(700);
await shot("mode-tray", await desktop());

// 5. Settings.
await open();
await click("Configurações");
const settingsBox = 'div[class*="h-[680px]"]';
await shot("settings-appearance", await rectOf(settingsBox));
await click("Conexões", `document.querySelector('${settingsBox}')`);
await shot("settings-connections", await rectOf(settingsBox));

// 6. Flows: palette, alarm, onboarding.
await open();
await click("Paleta");
await js(
  `(() => { const i = document.querySelector('input[placeholder]'); if (i) { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(i, 'timer'); i.dispatchEvent(new Event('input', { bubbles: true })) } })()`,
);
await sleep(500);
await shot("palette", await desktop());
await open();
// In notch mode the timer alarm is the notch grown into a card: frame just that.
await click("Notch no topo");
await click("Alarme");
await sleep(900);
{
  const d = await desktop();
  await shot("alarm", {
    x: d.x + d.width / 2 - 280,
    y: d.y,
    width: 560,
    height: 120,
  });
}
await open();
await click("Boas-vindas");
await sleep(600);
await shot("onboarding", await rectOf('div[class*="h-[560px]"]'));

await close();
setTimeout(() => process.exit(0), 200);
