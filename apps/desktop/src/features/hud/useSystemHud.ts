import { useEffect } from 'react'
import { create } from 'zustand'
import { backend, type PowerSnapshot } from '@/lib/ipc'
import { reactToOsVolume } from '@/features/music/volume'
import { alertSound } from '@/lib/notifySound'
import { alertMs, useSettings } from '@/stores/settings'
import { flashActivity, watchFlashes } from './flash'
import { feel, setRest } from '@/stores/mood'
import { hudFlash } from './hudActivity'
import { hudMood } from './hudMood'

/** Battery levels for the pill chip (laptop + wireless devices). */
export const usePower = create<PowerSnapshot>(() => ({ battery: null, devices: [] }))

const show = () => useSettings.getState().settings.appearance.pillShow

/** Keeps `usePower` fresh in this window (pill, Início card). */
export function usePowerFeed() {
  useEffect(() => {
    void backend.powerSnapshot().then((p) => usePower.setState(p))
    const off = backend.onPower((p) => usePower.setState(p))
    return () => void off.then((f) => f())
  }, [])
}

/**
 * Makes the pill react to the PC: flashes what changed (Caps Lock, mic, brightness,
 * charger, headsets), warns on low battery and moves Ekko's mood (sleepy when the PC is
 * left alone, a hop or a scare with what happens). For the surfaces that have a pill.
 */
export function useSystemHud() {
  usePowerFeed()
  useEffect(() => {
    reactToOsVolume()
    watchFlashes()
    const offHud = backend.onHud((e) => {
      if (e.kind === 'rest') setRest(e.level)
      const burst = hudMood(e)
      if (burst) feel(burst)
      const flash = hudFlash(e)
      if (!flash || !show()[flash.group]) return
      flashActivity(flash.activity, alertMs())
      if (flash.alert) alertSound(useSettings.getState().settings.general)
    })
    return () => void offHud.then((f) => f())
  }, [])
}
