import { describe, expect, it } from 'vitest'
import { comboFromKey, comboKeys, DEFAULT_SHORTCUTS, findConflicts } from './shortcutsCombo'

const press = (
  key: string,
  mods: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>> = {},
) => ({
  key,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
})

describe('shortcut combos', () => {
  it('builds canonical combos in a fixed modifier order', () => {
    expect(comboFromKey(press(' ', { shiftKey: true, ctrlKey: true }))).toBe('Ctrl+Shift+Space')
    expect(comboFromKey(press('e', { metaKey: true, altKey: true }))).toBe('Alt+Win+E')
    expect(comboFromKey(press('F8'))).toBe('F8')
    expect(comboFromKey(press('Escape'))).toBe('Esc')
    expect(comboFromKey({ ...press('!', { ctrlKey: true, shiftKey: true }), code: 'Digit1' })).toBe(
      'Ctrl+Shift+1',
    )
  })

  it('waits while only modifiers are held', () => {
    expect(comboFromKey(press('Control', { ctrlKey: true }))).toBeNull()
    expect(comboFromKey(press('Shift', { shiftKey: true }))).toBeNull()
  })

  it('splits combos into display keys in pt-BR', () => {
    expect(comboKeys('Ctrl+Shift+Space')).toEqual(['Ctrl', 'Shift', 'Espaço'])
    expect(comboKeys('Esc')).toEqual(['Esc'])
  })

  it('flags every id that shares a combo', () => {
    expect(findConflicts(DEFAULT_SHORTCUTS).size).toBe(0)
    const clash = { ...DEFAULT_SHORTCUTS, dictation: 'ctrl+shift+e' }
    expect([...findConflicts(clash)].sort()).toEqual(['dictation', 'selection'])
  })
})
