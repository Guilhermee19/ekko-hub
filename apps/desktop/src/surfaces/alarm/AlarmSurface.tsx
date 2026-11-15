import { useEffect, useState } from 'react'
import { AlarmOverlay, snoozeMs, type Alarm } from '@/features/notifications/AlarmOverlay'
import { backend } from '@/lib/ipc'

/** On-screen alarm window: shows the alarm the backend opened it for. */
export function AlarmSurface() {
  const [alarm, setAlarm] = useState<Alarm | null>(null)

  useEffect(() => {
    void backend.takeAlarm<Alarm>().then((a) => a && setAlarm(a))
    const off = backend.onAlarm<Alarm>((a) => setAlarm(a))
    return () => void off.then((f) => f())
  }, [])

  if (!alarm) return null
  const close = () => {
    setAlarm(null)
    void backend.hideSelf()
  }
  return (
    <div className="grid h-full place-items-center p-3">
      <AlarmOverlay
        key={alarm.id}
        alarm={alarm}
        onDismiss={close}
        onSnooze={() => {
          close()
          // The window's JS keeps running while hidden; F5 moves this to the backend.
          window.setTimeout(
            () => void backend.showAlarm({ ...alarm, firedAt: Date.now() }),
            snoozeMs,
          )
        }}
      />
    </div>
  )
}
