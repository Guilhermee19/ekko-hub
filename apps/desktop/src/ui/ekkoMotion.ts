import { useLayoutEffect, useRef, type RefObject } from 'react'

// Ekko's eye motion on the Web Animations API instead of CSS keyframes, so a change of
// look can start from wherever the eyes are mid-move (a blink, a nod) instead of
// snapping back to rest, and a reaction can replay without remounting the eyes.
// Lengths are viewBox units (36×16); in SVG a CSS px is one of them.

type Frames = Keyframe[]
interface Loop {
  frames: Frames
  ms: number
  easing?: string
}

const BLINK: Loop = {
  ms: 5500,
  easing: 'ease-in-out',
  frames: [
    { transform: 'scaleY(1)', offset: 0 },
    { transform: 'scaleY(1)', offset: 0.93 },
    { transform: 'scaleY(0.12)', offset: 0.96 },
    { transform: 'scaleY(1)', offset: 1 },
  ],
}

const GLANCE: Loop = {
  ms: 13000,
  easing: 'ease-in-out',
  frames: [
    { transform: 'translateX(0)', offset: 0 },
    { transform: 'translateX(0)', offset: 0.38 },
    { transform: 'translateX(-2.2px)', offset: 0.41 },
    { transform: 'translateX(-2.2px)', offset: 0.47 },
    { transform: 'translateX(0)', offset: 0.5 },
    { transform: 'translateX(0)', offset: 0.72 },
    { transform: 'translateX(2.2px)', offset: 0.75 },
    { transform: 'translateX(2.2px)', offset: 0.81 },
    { transform: 'translateX(0)', offset: 0.84 },
    { transform: 'translateX(0)', offset: 1 },
  ],
}

/** Thinking: eyes drift side to side. */
const LOOK: Loop = {
  ms: 1600,
  easing: 'ease-in-out',
  frames: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(2px)' },
    { transform: 'translateX(0)' },
    { transform: 'translateX(-2px)' },
    { transform: 'translateX(0)' },
  ],
}

/** Drowsy (eyes 7.5 tall): lids fall slowly, then he catches himself. The translate
 *  keeps the bottom edge still while the eye scales from its center. */
const NOD: Loop = {
  ms: 4500,
  easing: 'ease-in-out',
  frames: [
    { transform: 'translateY(0) scaleY(1)', offset: 0 },
    { transform: 'translateY(2.6px) scaleY(0.3)', offset: 0.68 },
    { transform: 'translateY(-0.9px) scaleY(1.25)', offset: 0.76 },
    { transform: 'translateY(0) scaleY(1)', offset: 0.84 },
    { transform: 'translateY(0) scaleY(1)', offset: 1 },
  ],
}

const BREATHE: Loop = {
  ms: 3600,
  easing: 'ease-in-out',
  frames: [
    { transform: 'translateY(0)' },
    { transform: 'translateY(0.8px)' },
    { transform: 'translateY(0)' },
  ],
}

/** Idle loop per look: on the whole pair (`body`) and on each eye. */
const LOOPS: Record<string, { body?: Loop; eye?: Loop }> = {
  calm: { body: GLANCE, eye: BLINK },
  speaking: { eye: BLINK },
  thinking: { body: LOOK },
  drowsy: { eye: NOD },
  asleep: { body: BREATHE },
}

/** One-shot reactions, played on their own layer above the loops. */
const BURSTS: Record<string, KeyframeAnimationOptions & { frames: Frames }> = {
  excited: {
    duration: 600,
    iterations: 4,
    easing: 'ease-out',
    frames: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-2.6px) scaleY(1.06)', offset: 0.35 },
      { transform: 'translateY(0.5px) scaleY(0.94)', offset: 0.7 },
      { transform: 'translateY(0)' },
    ],
  },
  startled: {
    duration: 520,
    easing: 'ease-out',
    frames: [
      { transform: 'scale(0.7)' },
      { transform: 'scale(1.16) translateY(-1px)', offset: 0.3 },
      { transform: 'translateX(-0.8px)', offset: 0.5 },
      { transform: 'translateX(0.8px)', offset: 0.7 },
      { transform: 'none' },
    ],
  },
}

/** Tags our animations: `getAnimations()` also lists the CSS morph transitions,
 *  which must keep running. */
const OURS = 'ekko-motion'

const stopOurs = (el: Element) => {
  for (const a of el.getAnimations()) if (a.id === OURS) a.cancel()
}

/** How long leaving a pose takes when the look changes mid-move. */
const SETTLE_MS = 450

function reducedMotion(): boolean {
  const pref = document.documentElement.dataset.reduceMotion
  if (pref === 'on') return true
  if (pref === 'off') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** jsdom (tests) has no Web Animations. */
const animatable = (el: Element | null): el is Element => !!el && typeof el.animate === 'function'

/** Starts `loop` on `el`, easing out of the pose it had (sum of both, fading). */
function retarget(el: Element | null, loop: Loop | undefined, smooth: boolean) {
  if (!animatable(el)) return
  const from = smooth ? getComputedStyle(el).transform : 'none'
  stopOurs(el)
  if (loop) {
    el.animate(loop.frames, {
      id: OURS,
      duration: loop.ms,
      iterations: Infinity,
      easing: loop.easing,
    })
  }
  if (from !== 'none') {
    el.animate([{ transform: from }, { transform: 'none' }], {
      duration: SETTLE_MS,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      composite: 'add',
      id: OURS,
    })
  }
}

interface Parts {
  react: RefObject<SVGGElement | null>
  body: RefObject<SVGGElement | null>
  eyes: RefObject<(SVGRectElement | null)[]>
}

/** Drives the loops for `look` and replays a reaction whenever `beat` bumps. */
export function useEkkoMotion(look: string, beat: number, { react, body, eyes }: Parts) {
  const shown = useRef<string | null>(null)
  const played = useRef(beat)

  useLayoutEffect(() => {
    if (shown.current === look) return
    const smooth = shown.current !== null && !reducedMotion()
    shown.current = look
    const loops = reducedMotion() ? {} : (LOOPS[look] ?? {})
    retarget(body.current, loops.body, smooth)
    for (const eye of eyes.current) retarget(eye, loops.eye, smooth)
  }, [look, body, eyes])

  useLayoutEffect(() => {
    if (played.current === beat) return
    played.current = beat
    const burst = BURSTS[look]
    const el = react.current
    if (!burst || !animatable(el) || reducedMotion()) return
    stopOurs(el)
    const { frames, ...timing } = burst
    el.animate(frames, { ...timing, id: OURS })
  }, [beat, look, react])
}
