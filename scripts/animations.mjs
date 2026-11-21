// Records the README animations (animated WebP) from the browser gallery: Ekko's moods,
// the notch opening, its alert cards, the command palette and the holiday themes. Setup in scripts/cdp.mjs; needs ffmpeg
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
const FFPROBE = process.env.FFPROBE ?? "ffprobe";
mkdirSync(OUT, { recursive: true });

const page = await connect({ reduceMotion: false });
const { send, js, open, click, rectOf, mouse } = page;

/**
 * Encodes timed frames into an animated WebP. Each frame lasts until the next one, so
 * the motion plays at true speed; `crop` cuts the clip out of full-page frames.
 */
function encode(name, dir, frames, endAt, { width, fps, quality, crop }) {
  const list = frames
    .map((f, i) => {
      const next = frames[i + 1]?.at ?? endAt;
      return `file '${f.file.replaceAll("\\", "/")}'\nduration ${(Math.max(1, next - f.at) / 1000).toFixed(3)}`;
    })
    .join("\n");
  const listFile = path.join(dir, "list.txt");
  writeFileSync(
    listFile,
    `${list}\nfile '${frames.at(-1).file.replaceAll("\\", "/")}'\n`,
  );
  const filters = [
    ...(crop ? [`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`] : []),
    `fps=${fps}`,
    `scale=${width}:-1:flags=lanczos`,
  ];
  execFileSync(FFMPEG, [
    ...["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listFile],
    ...["-vf", filters.join(",")],
    ...["-c:v", "libwebp_anim", "-lossless", "0", "-q:v", String(quality)],
    ...["-loop", "0", path.join(OUT, `${name}.webp`)],
  ]);
  rmSync(dir, { recursive: true, force: true });
  console.log("✓", name, `(${frames.length} quadros)`);
}

/**
 * Records `clip` while `scene` runs: the browser streams every painted frame
 * (screencast, up to 60 fps) and ffmpeg crops `clip` out of them, at a steady 30 fps.
 * `clip` must be inside the viewport.
 */
async function record(
  name,
  clip,
  scene,
  { scale = 0.6, quality = 85, fps = 30 } = {},
) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `ekko-${name}-`));
  const frames = [];
  page.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    void send("Page.screencastFrameAck", { sessionId });
    const file = path.join(
      dir,
      `${String(frames.length).padStart(5, "0")}.jpg`,
    );
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, at: metadata.timestamp * 1000 });
  });
  await send("Page.startScreencast", {
    format: "jpeg",
    quality: 80,
    everyNthFrame: 1,
  });
  await scene();
  await send("Page.stopScreencast");
  page.on("Page.screencastFrame", null);
  const endAt = Date.now();
  if (!frames.length)
    throw new Error(`${name}: o screencast não mandou quadros`);
  // Frame pixels per CSS pixel, measured on the first frame.
  const frameW = Number(
    execFileSync(FFPROBE, [
      ...["-v", "error", "-show_entries", "stream=width", "-of", "csv=p=0"],
      frames[0].file,
    ])
      .toString()
      .trim(),
  );
  const k = frameW / (await js("innerWidth"));
  const crop = {
    x: Math.round(clip.x * k),
    y: Math.round(clip.y * k),
    w: Math.round(clip.width * k),
    h: Math.round(clip.height * k),
  };
  const width = Math.round(clip.width * 2 * scale);
  // Validation: how often the browser missed frames while painting (gaps > 50 ms
  // between two painted frames). Quiet stretches send nothing, so only count gaps
  // shorter than 250 ms, which happen in the middle of motion.
  const gaps = frames.slice(1).map((f, i) => f.at - frames[i].at);
  const missed = gaps.filter((g) => g > 50 && g < 250).length;
  console.log(
    `  ${name}: ${frames.length} quadros pintados, ${missed} buracos de 50–250 ms`,
  );
  if (process.env.GAPS)
    console.log(
      "   ",
      gaps
        .map((g, i) => [Math.round(frames[i].at - frames[0].at), Math.round(g)])
        .filter(([, g]) => g > 50 && g < 250)
        .map(([t, g]) => `${t}ms:+${g}`)
        .join(" "),
    );
  encode(name, dir, frames, endAt, { width, fps, quality, crop });
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
/** `ONLY=anim-alerts,anim-moods` records just those. */
const ONLY = process.env.ONLY?.split(",");
const want = (name) => !ONLY || ONLY.includes(name);

// 1. Moods: calm, sleepy, asleep, woken up with a start, then a happy hop.
if (want("anim-moods")) {
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
}

// 2. The notch opening on hover: the eyes glide to the middle, the panel grows.
if (want("anim-notch")) {
  await open();
  await click("Notch no topo");
  await click("Timer");
  await mouse(40, 900);
  await sleep(800);
  {
    const d = await desktop();
    const clip = {
      x: d.x + d.width / 2 - 360,
      y: d.y,
      width: 720,
      height: 430,
    };
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
}

// 2b. Alerts: the notch grows into a card for a new song, a timer going off and a
// notification, then shrinks back to the pill.
if (want("anim-alerts")) {
  await open();
  await click("Notch no topo");
  await quiet();
  await mouse(40, 900);
  await sleep(600);
  {
    const d = await desktop();
    const clip = {
      x: d.x + d.width / 2 - 260,
      y: d.y,
      width: 520,
      height: 120,
    };
    const alerts = (call) =>
      js(`import('/src/features/alerts/store.ts').then((a) => { ${call} })`);
    await record(
      "anim-alerts",
      clip,
      async () => {
        await sleep(900);
        await js(`import('/src/features/music/store.ts').then((m) => m.useMusic.setState({
          track: { id: 'demo-song', title: 'Shoot to Thrill', artist: 'AC/DC', album: 'Back in Black',
            durationSec: 317, cover: 'linear-gradient(135deg, #1f1f1f, #b8860b)' },
          playing: true, positionSec: 96 }))`);
        await sleep(3200);
        await alerts(`a.dismissAlert()`);
        await sleep(900);
        await js(`import('/src/lib/ipc/index.ts').then((m) => m.backend.showAlarm({
          id: 'demo-alarm', kind: 'timer', title: 'Pão de queijo', detail: 'Timer de 25 min', firedAt: Date.now() }))`);
        await sleep(3200);
        await alerts(`a.dismissAlert()`);
        await sleep(900);
        await click("Notificação");
        await sleep(3000);
        await alerts(`a.dismissAlert()`);
        await sleep(1200);
      },
      { scale: 0.6, quality: 82, fps: 30 },
    );
  }
}

// 2c. The command palette popping in.
if (want("anim-palette")) {
  await open();
  await sleep(400);
  {
    const d = await desktop();
    const clip = {
      x: d.x + d.width / 2 - 340,
      y: d.y,
      width: 680,
      height: 420,
    };
    await record(
      "anim-palette",
      clip,
      async () => {
        await sleep(700);
        await click("Paleta");
        await sleep(2200);
      },
      { scale: 0.45 },
    );
  }
}

// 3. Holiday themes: every preview from Configurações → Temas de época.
if (want("anim-seasons")) {
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
}

await page.close();
setTimeout(() => process.exit(0), 200);
