// Records the README animations (animated WebP) from the browser gallery: Ekko's moods,
// the notch opening and the holiday themes. Setup in scripts/cdp.mjs; needs ffmpeg
// with libwebp on PATH (or FFMPEG=<path>).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect, DESKTOP, NOTCH, sleep } from "./cdp.mjs";

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../docs/screenshots",
);
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
mkdirSync(OUT, { recursive: true });

const page = await connect({ reduceMotion: false });
const { send, js, open, click, rectOf, mouse } = page;

/**
 * Grabs frames of `clip` while `scene` runs, then encodes them with their real timing.
 * `scale` shrinks the 2× capture to keep the file light.
 */
async function record(name, clip, scene, { scale = 0.5, quality = 72 } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `ekko-${name}-`));
  const frames = [];
  let running = true;
  const grab = (async () => {
    while (running) {
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        clip: { ...clip, scale: 1 },
      });
      const file = path.join(
        dir,
        `${String(frames.length).padStart(4, "0")}.png`,
      );
      writeFileSync(file, Buffer.from(data, "base64"));
      frames.push({ file, at: performance.now() });
    }
  })();
  await scene();
  running = false;
  await grab;
  // Concat list with each frame's real duration, so the motion plays at true speed.
  const list = frames
    .map((f, i) => {
      const next = frames[i + 1]?.at ?? f.at + 80;
      return `file '${f.file.replaceAll("\\", "/")}'\nduration ${((next - f.at) / 1000).toFixed(3)}`;
    })
    .join("\n");
  const listFile = path.join(dir, "list.txt");
  writeFileSync(
    listFile,
    `${list}\nfile '${frames.at(-1).file.replaceAll("\\", "/")}'\n`,
  );
  const width = Math.round(clip.width * 2 * scale);
  execFileSync(FFMPEG, [
    ...["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listFile],
    ...["-vf", `fps=15,scale=${width}:-1:flags=lanczos`],
    ...[
      "-c:v",
      "libwebp_anim",
      "-lossless",
      "0",
      "-q:v",
      String(quality),
      "-loop",
      "0",
    ],
    path.join(OUT, `${name}.webp`),
  ]);
  rmSync(dir, { recursive: true, force: true });
  console.log("✓", name, `(${frames.length} quadros)`);
}

/** The gallery's mock stores, reached through Vite's module graph. */
const store = (file, call) =>
  js(`import('/src/stores/${file}.ts').then((m) => { ${call} })`);
/** An empty pill (no timer, music, event or shelf), so only the eyes show. */
const quiet = () =>
  js(`Promise.all([import('/src/lib/ipc/index.ts'), import('/src/stores/settings.ts')])
    .then(async ([{ backend }, { useSettings }]) => {
      const a = useSettings.getState().settings.appearance
      await backend.setAppearance({ ...a, pillShow: { ...a.pillShow, timer: false, music: false, event: false } })
      await backend.shelfClear()
    })`);
const mood = (call) => store("mood", call);

const desktop = () => rectOf(DESKTOP);

// 1. Moods: calm, sleepy, asleep, woken up with a start, then a happy hop.
await open();
await click("Notch no topo");
await quiet();
await mood(`m.useMood.setState({ rest: 'awake', burst: null })`);
await sleep(800);
{
  const d = await desktop();
  const clip = { x: d.x + d.width / 2 - 130, y: d.y, width: 260, height: 56 };
  await record(
    "anim-moods",
    clip,
    async () => {
      await sleep(2600);
      await mood(`m.setRest('drowsy')`);
      await sleep(3200);
      await mood(`m.setRest('asleep')`);
      await sleep(3600);
      await mood(`m.setRest('awake')`);
      await sleep(2200);
      await mood(`m.feel('excited')`);
      await sleep(3000);
    },
    { scale: 0.75, quality: 90 },
  );
}

// 2. The notch opening on hover: the eyes glide to the middle, the panel grows.
await open();
await click("Notch no topo");
await click("Timer");
await mouse(40, 900);
await sleep(800);
{
  const d = await desktop();
  const clip = { x: d.x + d.width / 2 - 360, y: d.y, width: 720, height: 430 };
  await record(
    "anim-notch",
    clip,
    async () => {
      await sleep(1200);
      const n = await rectOf(NOTCH);
      await mouse(n.x + n.width / 2, n.y + 12);
      await sleep(3200);
      await mouse(40, 900);
      await sleep(1800);
    },
    { scale: 0.45 },
  );
}

// 3. Holiday themes: every preview from Configurações → Temas de época.
await open();
await click("Configurações");
await click("Temas de época");
await sleep(600);
{
  const grid = await js(`(() => {
    const ul = document.querySelector('li > span.notch-pill')?.closest('ul')
    ul?.scrollIntoView({ block: 'center' })
    const r = ul?.getBoundingClientRect()
    return r && { x: r.x, y: r.y, width: r.width, height: r.height }
  })()`);
  if (!grid) throw new Error("prévias dos temas não encontradas");
  await record("anim-seasons", grid, () => sleep(7000), { scale: 0.5 });
}

await page.close();
setTimeout(() => process.exit(0), 200);
