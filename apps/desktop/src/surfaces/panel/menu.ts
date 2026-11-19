import type { PanelMenu } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { VISIBLE_NAV, type NavItem, type PageId } from './nav'

export interface MenuRow {
  item: NavItem
  visible: boolean
}

/** Every page that works today, in the user's order, with its on/off state. */
export function menuRows(menu: PanelMenu, pages: readonly NavItem[] = VISIBLE_NAV): MenuRow[] {
  const rank = (id: PageId) => {
    const i = menu.order.indexOf(id)
    return i < 0 ? menu.order.length + pages.findIndex((p) => p.id === id) : i
  }
  return [...pages]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((item) => ({ item, visible: !menu.hidden.includes(item.id) }))
}

/** What the panel menu shows; never empty, so the panel can't lose its way back. */
export function menuNav(menu: PanelMenu, pages: readonly NavItem[] = VISIBLE_NAV): NavItem[] {
  const shown = menuRows(menu, pages)
    .filter((r) => r.visible)
    .map((r) => r.item)
  return shown.length > 0 ? shown : pages.slice(0, 1)
}

/** Turns a page on or off; the last visible page stays on. */
export function setPageVisible(menu: PanelMenu, rows: MenuRow[], id: PageId, on: boolean) {
  const hidden = menu.hidden.filter((h) => h !== id)
  if (!on) {
    if (rows.filter((r) => r.visible && r.item.id !== id).length === 0) return menu
    hidden.push(id)
  }
  return { ...menu, hidden }
}

export function useMenuNav() {
  const menu = useSettings((s) => s.settings.appearance.panelMenu)
  return menuNav(menu)
}
