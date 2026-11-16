/**
 * Wraps an async sender so rapid calls (a slider drag) keep at most one request in
 * flight and always finish with the latest value; values in between are dropped.
 */
export function coalesce<T>(send: (value: T) => Promise<unknown>): (value: T) => void {
  let busy = false
  let pending: { value: T } | null = null
  const run = (value: T) => {
    busy = true
    send(value)
      .catch((err: unknown) => console.warn('[ekko] envio falhou', err))
      .finally(() => {
        busy = false
        const next = pending
        pending = null
        if (next) run(next.value)
      })
  }
  return (value) => {
    if (busy) pending = { value }
    else run(value)
  }
}
