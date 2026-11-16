// Mirrors commands/connectors.rs (Home Assistant + Claude Code detection).

export interface HomeAssistantStatus {
  /** Normalized base URL saved in settings. */
  url: string | null
  /** Long-lived token saved in the Credential Manager (never sent to the UI). */
  hasToken: boolean
  connected: boolean
  version: string | null
  locationName: string | null
  /** Why the last check failed (pt-BR). */
  error: string | null
}

export interface HaEntity {
  entityId: string
  name: string
  /** Raw HA state: "on", "off", "unavailable"… */
  state: string
  domain: string
}

export interface ClaudeCodeStatus {
  found: boolean
  path: string | null
  /** First line of `claude --version`, e.g. "2.1.3 (Claude Code)". */
  version: string | null
}

export interface ConnectorsBackend {
  haStatus(): Promise<HomeAssistantStatus>
  /** Saves URL + token (empty token keeps the saved one) and tests the link. */
  haSet(url: string, token: string): Promise<HomeAssistantStatus>
  haDisconnect(): Promise<HomeAssistantStatus>
  haEntities(domain?: string): Promise<HaEntity[]>
  /** Resolves with the entities HA reports as changed. */
  haToggle(entityId: string): Promise<HaEntity[]>
  claudeCodeStatus(): Promise<ClaudeCodeStatus>
}
