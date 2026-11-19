import { describe, expect, it } from 'vitest'
import type { PanelMenu } from '@/lib/ipc'
import { menuNav, menuRows, setPageVisible } from './menu'
import { VISIBLE_NAV } from './nav'

const EMPTY: PanelMenu = { order: [], hidden: [] }
const ids = (items: { id: string }[]) => items.map((i) => i.id)

describe('panel menu', () => {
  it('defaults to every working page in the built-in order', () => {
    expect(ids(menuNav(EMPTY))).toEqual(ids(VISIBLE_NAV))
  })

  it('puts ordered pages first and the rest after, in default order', () => {
    const nav = ids(menuNav({ order: ['music', 'timers'], hidden: [] }))
    expect(nav.slice(0, 2)).toEqual(['music', 'timers'])
    expect(nav).toHaveLength(VISIBLE_NAV.length)
    expect(nav[2]).toBe('home')
  })

  it('hides pages and ignores ids that are unknown or still "Em breve"', () => {
    const nav = ids(menuNav({ order: ['chat', 'nope', 'tasks'], hidden: ['home'] }))
    expect(nav[0]).toBe('tasks')
    expect(nav).not.toContain('home')
    expect(nav).not.toContain('chat')
  })

  it('never ends up empty', () => {
    const all = ids(VISIBLE_NAV)
    expect(ids(menuNav({ order: [], hidden: all }))).toEqual([all[0]])
    let menu: PanelMenu = { order: [], hidden: all.slice(1) }
    menu = setPageVisible(menu, menuRows(menu), VISIBLE_NAV[0].id, false)
    expect(menu.hidden).not.toContain(all[0])
  })

  it('turns a hidden page back on', () => {
    const menu: PanelMenu = { order: [], hidden: ['music'] }
    expect(setPageVisible(menu, menuRows(menu), 'music', true).hidden).toEqual([])
  })
})
