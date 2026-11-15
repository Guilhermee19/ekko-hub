import { describe, expect, it } from 'vitest'
import { LOG_TICK_MS, logTail } from './diagnosticsChecks'
import { filterAudit, MOCK_AUDIT } from './privacyModel'
import { allowedOverrides, effectivePermission, filterTools, type ToolInfo } from './toolsModel'

describe('effectivePermission', () => {
  it('follows the autonomy level by default', () => {
    expect(effectivePermission('ask', 'safe')).toBe('ask')
    expect(effectivePermission('balanced', 'safe')).toBe('run')
    expect(effectivePermission('balanced', 'confirm')).toBe('ask')
    expect(effectivePermission('auto', 'confirm')).toBe('run')
  })

  it('always asks for dangerous tools, whatever the autonomy or override', () => {
    expect(effectivePermission('auto', 'dangerous')).toBe('ask')
    expect(effectivePermission('auto', 'dangerous', 'never')).toBe('ask')
  })

  it('lets per-tool overrides win over the autonomy level', () => {
    expect(effectivePermission('auto', 'safe', 'always')).toBe('ask')
    expect(effectivePermission('ask', 'confirm', 'never')).toBe('run')
  })

  it('hides "never ask" for dangerous tools', () => {
    expect(allowedOverrides('dangerous')).not.toContain('never')
    expect(allowedOverrides('confirm')).toContain('never')
  })
})

describe('filterTools', () => {
  const tools: ToolInfo[] = [
    {
      id: 'a',
      name: 'Calculadora',
      example: 'quanto é 2+2',
      risk: 'safe',
      category: 'basic',
      phase: 'F4',
    },
    {
      id: 'b',
      name: 'Fechar app',
      example: 'fecha o Chrome',
      risk: 'confirm',
      category: 'pc',
      phase: 'F6',
    },
  ]

  it('matches name or example ignoring accents and case', () => {
    expect(filterTools(tools, 'QUANTO E', 'all').map((t) => t.id)).toEqual(['a'])
    expect(filterTools(tools, 'chrome', 'all').map((t) => t.id)).toEqual(['b'])
  })

  it('filters by category', () => {
    expect(filterTools(tools, '', 'pc').map((t) => t.id)).toEqual(['b'])
  })
})

describe('filterAudit', () => {
  it('combines risk and result filters', () => {
    const rows = filterAudit(MOCK_AUDIT, { risk: 'dangerous', result: 'denied' })
    expect(rows.map((r) => r.id)).toEqual(['a3'])
    expect(filterAudit(MOCK_AUDIT, { risk: 'all', result: 'all' })).toHaveLength(MOCK_AUDIT.length)
  })
})

describe('logTail', () => {
  it('returns the last n lines ending at the current tick', () => {
    const tail = logTail(LOG_TICK_MS * 30, 12)
    expect(tail).toHaveLength(12)
    expect(tail.at(-1)?.key).toBe(30)
    expect(tail[0].key).toBe(19)
  })
})
