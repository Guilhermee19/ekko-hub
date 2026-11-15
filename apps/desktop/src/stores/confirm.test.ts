import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOLD_MS, UNDO_MS, holdLeft, requestConfirm, useConfirm } from './confirm'

const base = { title: 't', detail: 'd', tool: 'x.y' }

describe('confirm queue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useConfirm.setState({ queue: [], undo: null })
  })
  afterEach(() => vi.useRealTimers())

  it('shows one request at a time and resolves in order', async () => {
    const a = requestConfirm({ ...base, risk: 'confirm' })
    const b = requestConfirm({ ...base, risk: 'confirm', title: 'b' })
    expect(useConfirm.getState().queue).toHaveLength(2)
    useConfirm.getState().answer(true)
    await expect(a).resolves.toBe(true)
    expect(useConfirm.getState().queue[0].title).toBe('b')
    useConfirm.getState().answer(false)
    await expect(b).resolves.toBe(false)
    expect(useConfirm.getState().queue).toHaveLength(0)
  })

  it('holds dangerous confirms but allows cancelling', async () => {
    const p = requestConfirm({ ...base, risk: 'dangerous' })
    const head = useConfirm.getState().queue[0]
    expect(holdLeft(head, head.shownAt)).toBe(HOLD_MS)
    useConfirm.getState().answer(true) // too early: ignored
    expect(useConfirm.getState().queue).toHaveLength(1)
    vi.advanceTimersByTime(HOLD_MS)
    expect(holdLeft(head, Date.now())).toBe(0)
    useConfirm.getState().answer(true)
    await expect(p).resolves.toBe(true)
  })

  it('restarts the hold when a queued dangerous request becomes visible', () => {
    void requestConfirm({ ...base, risk: 'confirm' })
    void requestConfirm({ ...base, risk: 'dangerous' })
    vi.advanceTimersByTime(HOLD_MS + 500)
    useConfirm.getState().answer(true)
    const head = useConfirm.getState().queue[0]
    expect(holdLeft(head, Date.now())).toBe(HOLD_MS)
  })

  it('offers undo for undoable actions and expires it', () => {
    const onUndo = vi.fn()
    void requestConfirm({ ...base, risk: 'confirm', undoable: true, onUndo })
    useConfirm.getState().answer(true)
    expect(useConfirm.getState().undo?.title).toBe('t')
    useConfirm.getState().undoLast()
    expect(onUndo).toHaveBeenCalledOnce()
    expect(useConfirm.getState().undo).toBeNull()

    void requestConfirm({ ...base, risk: 'confirm', undoable: true })
    useConfirm.getState().answer(true)
    vi.advanceTimersByTime(UNDO_MS)
    expect(useConfirm.getState().undo).toBeNull()
  })
})
