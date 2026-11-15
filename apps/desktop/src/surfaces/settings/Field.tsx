import type { ReactNode } from 'react'

/** Settings row: title, one-line hint, control. */
export function Field({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-[14px] font-medium">{title}</h2>
      <p className="mb-3 text-[12px] text-muted">{hint}</p>
      {children}
    </section>
  )
}
