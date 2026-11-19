import { describe, expect, it } from 'vitest'
import { NAV, VISIBLE_NAV } from '@/surfaces/panel/nav'
import { PAGE_AVAILABILITY, pageShown, sectionShown } from './availability'

describe('availability', () => {
  it('keeps prototypes out of the menu', () => {
    const ids = VISIBLE_NAV.map((n) => n.id)
    expect(ids).not.toContain('chat')
    expect(ids).not.toContain('routines')
    expect(ids).not.toContain('memory')
    expect(ids).toContain('clipboard')
    // Every hidden page is hidden on purpose ("Em breve"), never by accident.
    for (const n of NAV.filter((n) => !ids.includes(n.id))) {
      expect(PAGE_AVAILABILITY[n.id].status).toBe('soon')
    }
  })

  it('hides settings sections that do nothing yet', () => {
    expect(sectionShown('brain')).toBe(false)
    expect(sectionShown('diagnostics')).toBe(false)
    expect(sectionShown('appearance')).toBe(true)
    expect(sectionShown('privacy')).toBe(true)
    expect(pageShown('home')).toBe(true)
  })
})
