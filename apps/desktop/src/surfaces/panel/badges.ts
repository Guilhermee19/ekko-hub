import { useHabits } from '@/features/habits/store'
import { selectUnread, useNotifications } from '@/features/notifications/store'
import { useTasks } from '@/features/tasks/store'
import { useTimers } from '@/features/timers/store'
import type { PageId } from './nav'

/** Live counters next to sidebar items (open tasks, running timers, water). */
export function useNavBadges(): Partial<Record<PageId, string>> {
  const openTasks = useTasks((s) => s.tasks.filter((t) => !t.done).length)
  const timers = useTimers((s) => s.timers.length)
  const water = useHabits((s) => s.water)
  const unread = useNotifications(selectUnread)
  return {
    tasks: openTasks ? String(openTasks) : undefined,
    timers: timers ? String(timers) : undefined,
    habits: `${water.count}/${water.goal}`,
    notifications: unread ? String(unread) : undefined,
  }
}
