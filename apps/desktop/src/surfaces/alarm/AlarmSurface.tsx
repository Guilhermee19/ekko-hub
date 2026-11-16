import { useEffect, useState } from 'react'
import { AlarmOverlay, snoozeMs, type Alarm } from '@/features/notifications/AlarmOverlay'
import { backend } from '@/lib/ipc'
import { alertSound } from '@/lib/notifySound'

/** On-screen alarm window: shows the alarm the backend opened it for. */
export function AlarmSurface() {
  const [alarm, setAlarm] = useState<Alarm | null>(null)

  useEffect(() => {
    void backend.takeAlarm<Alarm>().then((a) => a && setAlarm(a))
    const off = backend.onAlarm<Alarm>((a) => setAlarm(a))
    return () => void off.then((f) => f())
  }, [])

  // Alarms the user set always show; under "Não perturbe" they just stay silent.
  // Fresh settings: this window may have just been built.
  const alarmId = alarm?.id
  useEffect(() => {
    if (alarmId) void backend.getSettings().then((s) => alertSound(s.general))
  }, [alarmId])

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
          // Real backend timer/reminder: it fires again even with this window gone.
          if (alarm.kind === 'reminder')
            void backend.reminderAdd(alarm.title, Date.now() + snoozeMs)
          else void backend.timerAdd(alarm.title, Math.round(snoozeMs / 1000))
        }}
      />
    </div>
  )
}
