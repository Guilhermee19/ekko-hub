import { describe, expect, it } from 'vitest'
import { coalesce } from './coalesce'

describe('coalesce', () => {
  it('sends the first value, then only the latest one queued meanwhile', async () => {
    const sent: number[] = []
    let release: () => void = () => {}
    const send = coalesce((v: number) => {
      sent.push(v)
      return new Promise<void>((r) => (release = r))
    })
    send(1)
    send(2)
    send(3)
    expect(sent).toEqual([1])
    release()
    await new Promise((r) => setTimeout(r, 0))
    expect(sent).toEqual([1, 3])
    release()
    await new Promise((r) => setTimeout(r, 0))
    expect(sent).toEqual([1, 3])
  })
})
