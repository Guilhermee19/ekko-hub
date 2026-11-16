import type { GeneralSettings, NotifySound } from '@/lib/ipc'
import { dndActive } from './quietHours'

// Notification tones synthesized with Web Audio (no audio files).

interface Note {
  freq: number
  /** Start offset and length, seconds. */
  at: number
  len: number
}

const TONES: Record<Exclude<NotifySound, 'none'>, { wave: OscillatorType; notes: Note[] }> = {
  chime: {
    wave: 'sine',
    notes: [
      { freq: 880, at: 0, len: 0.35 },
      { freq: 1320, at: 0.12, len: 0.5 },
    ],
  },
  ping: { wave: 'triangle', notes: [{ freq: 1760, at: 0, len: 0.18 }] },
  soft: {
    wave: 'sine',
    notes: [
      { freq: 523, at: 0, len: 0.6 },
      { freq: 659, at: 0.2, len: 0.7 },
    ],
  },
}

let ctx: AudioContext | null = null

export function playTone(sound: NotifySound, volume: number) {
  if (sound === 'none' || volume <= 0 || typeof AudioContext === 'undefined') return
  ctx ??= new AudioContext()
  void ctx.resume()
  const { wave, notes } = TONES[sound]
  const t0 = ctx.currentTime + 0.02
  for (const n of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave
    osc.frequency.value = n.freq
    // Quick attack, exponential tail: a bell, not a beep.
    gain.gain.setValueAtTime(0.0001, t0 + n.at)
    gain.gain.exponentialRampToValueAtTime(0.25 * volume, t0 + n.at + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.len)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0 + n.at)
    osc.stop(t0 + n.at + n.len + 0.05)
  }
}

const CLAIM_KEY = 'ekko-sound-at'
const CLAIM_MS = 800

/** Every window gets backend notifications; only the first one in a short window plays. */
function claim(): boolean {
  try {
    const now = Date.now()
    if (now - Number(localStorage.getItem(CLAIM_KEY) ?? 0) < CLAIM_MS) return false
    localStorage.setItem(CLAIM_KEY, String(now))
  } catch {
    // No storage: better a doubled tone than none.
  }
  return true
}

/** Plays the chosen tone unless "Não perturbe" is on. Returns whether it is quiet time. */
export function alertSound(general: GeneralSettings, now = new Date()): boolean {
  const quiet = dndActive(general.dnd, now)
  if (!quiet && claim()) playTone(general.sound, general.volume)
  return quiet
}
