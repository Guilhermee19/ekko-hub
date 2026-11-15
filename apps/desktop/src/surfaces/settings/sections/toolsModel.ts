// Pure permission + catalog logic for "Funções e autonomia". Mirrors what `ekko-tools`
// will enforce in F4+: the UI and the agent loop must agree on when Ekko asks first.

export type Risk = 'safe' | 'confirm' | 'dangerous'
export type Autonomy = 'ask' | 'balanced' | 'auto'
export type ToolOverride = 'default' | 'always' | 'never'
export type Decision = 'run' | 'ask'

export type ToolCategory = 'basic' | 'productivity' | 'pc' | 'integrations'

export interface ToolInfo {
  id: string
  name: string
  example: string
  risk: Risk
  category: ToolCategory
  /** Roadmap phase that ships it ("F4", "F6"…). */
  phase: string
}

export const CATEGORY_LABEL: Record<ToolCategory, string> = {
  basic: 'Básico',
  productivity: 'Produtividade',
  pc: 'Controle do PC',
  integrations: 'Integrações',
}

export const RISK_LABEL: Record<Risk, string> = {
  safe: 'Seguro',
  confirm: 'Pede confirmação',
  dangerous: 'Perigoso',
}

export const AUTONOMY_HINT: Record<Autonomy, string> = {
  ask: 'O Ekko pede sua confirmação antes de qualquer ação.',
  balanced:
    'Ações seguras rodam direto; as que mudam algo pedem confirmação, e as perigosas sempre.',
  auto: 'Só ações perigosas (desligar, shell, teclado e mouse) pedem confirmação.',
}

/** Decides whether a tool call runs straight away or goes through the confirm dialog. */
export function effectivePermission(
  autonomy: Autonomy,
  risk: Risk,
  override: ToolOverride = 'default',
): Decision {
  if (override === 'always') return 'ask'
  // Dangerous tools always ask: no override or autonomy level can skip that.
  if (risk === 'dangerous') return 'ask'
  if (override === 'never') return 'run'
  if (autonomy === 'ask') return 'ask'
  if (autonomy === 'balanced') return risk === 'safe' ? 'run' : 'ask'
  return 'run'
}

/** Overrides offered per risk level ("nunca perguntar" is not allowed for dangerous tools). */
export function allowedOverrides(risk: Risk): ToolOverride[] {
  return risk === 'dangerous' ? ['default', 'always'] : ['default', 'always', 'never']
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Accent-insensitive search over name + example, plus optional category filter. */
export function filterTools<T extends ToolInfo>(
  tools: T[],
  query: string,
  category: ToolCategory | 'all',
): T[] {
  const q = normalize(query.trim())
  return tools.filter(
    (t) =>
      (category === 'all' || t.category === category) &&
      (!q || normalize(`${t.name} ${t.example}`).includes(q)),
  )
}
