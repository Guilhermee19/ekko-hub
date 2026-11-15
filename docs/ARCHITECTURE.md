# Arquitetura: Ekko Hub

## Visão

```
           ┌──────────────── apps/desktop (Tauri 2) ────────────────┐
           │  src/ (React)         ⇄ IPC ⇄    src-tauri/ (shell)    │
           │  janelas por modo               comandos, eventos,     │
           │  features/ ui/ theme/           janelas, tray          │
           └───────────────────────────────┬────────────────────────┘
                                           │ usa
   ┌───────────┬───────────┬───────────────┼────────────┬──────────────┬───────────────────┐
 ekko-core   ekko-ai    ekko-tools     ekko-voice     ekko-os       ekko-store    ekko-integrations
 tipos,      providers  registro de    mic, VAD,      Windows:      SQLite,       clima, Spotify,
 settings,   LLM, loop  tools + risco  wake, STT,     volume, apps, migrações,    Calendar, Tuya…
 eventos     do agente  + auditoria    TTS            janelas…      memória
                                           │
                               apps/server (v2, axum) usa as mesmas crates
```

As crates entram **conforme a fase pede**. Não criamos crates vazias antes da hora.

## Regras

1. **Lógica nunca na camada Tauri.** `src-tauri` só traduz IPC ↔ crates, gerencia janelas e o tray. Tudo que o servidor da v2 também vai usar fica em `crates/`.
2. **Código em inglês, UI em pt-BR.** Identificadores, arquivos e commits (título) em inglês. Textos da interface em pt-BR, centralizados para facilitar i18n.
3. **Arquivos pequenos.** Meta de menos de ~300 linhas por arquivo. Passou disso, quebre por responsabilidade.
4. **Toda capacidade é uma Tool.** Cada tool fica em um arquivo e tem `name`, `description`, `schema` (JSON Schema), `risk: Safe | Confirm | Dangerous`, `execute()` e testes. O agente usa function calling nativo. Nada de roteador de "verbo único".
5. **Autonomia e auditoria.** Toda execução de tool gera um registro de auditoria. `Confirm` e `Dangerous` pedem confirmação, conforme o nível de autonomia escolhido.
6. **Tipos gerados.** Rust → TS via tauri-specta (a partir da F2). Na F0/F1 os tipos ficam em `apps/desktop/src/lib/ipc/types.ts`, espelhando `ekko-core`.
7. **Segredos fora de arquivos.** Chaves de API vão para o Windows Credential Manager (`keyring`). Settings em JSON só guardam referências.
8. **Dados fora do repo.** Tudo do usuário vai em `%APPDATA%\ekko-hub`.
9. **Mock-first no frontend.** A UI só conhece `lib/ipc`. O backend é escolhido no boot: `tauri` (real) ou `mock` (galeria no navegador e protótipo da F1).
10. **Comentários curtos.** Explique o *porquê* em uma ou duas linhas. Ensaios vão para `docs/adr/`.

## Frontend (`apps/desktop/src`)

```
src/
├─ main.tsx              entrada única; escolhe a superfície pela label da janela
├─ surfaces/             uma pasta por superfície/modo de exibição
│  ├─ notch/  tray/  orb/  dock/  hub/  voice-only/  panel/  settings/  gallery/
├─ features/             uma pasta por feature (home, chat, tasks, timers, habits, music,
│                        clipboard, routines, mypc, memory…): componentes + store da feature
├─ ui/                   design system (sem regra de negócio)
├─ theme/                tokens.css, personas, hook usePersona
├─ lib/ipc/              contrato com o backend: types.ts, index.ts, tauri.ts, mock/
└─ lib/                  utilitários puros (cn, format…)
```

- **Janela → superfície:** cada janela Tauri tem uma label (`notch`, `tray`, `orb`, `dock`, `hub`, `voice`, `settings`) e `main.tsx` renderiza a superfície correspondente. No navegador, `?surface=` escolhe a superfície, e o padrão é a galeria.
- **Estado:** zustand, um store por feature. O estado vindo do backend chega por eventos.
- **Estilo:** Tailwind 4 com tokens CSS. Toda cor sai dos tokens (ver DESIGN.md).

## Backend (`apps/desktop/src-tauri`)

```
src-tauri/src/
├─ main.rs / lib.rs     bootstrap, plugins, registro de comandos
├─ commands/            um arquivo por domínio (display, settings, …)
├─ display/             modos de exibição: criação e posicionamento das janelas
│  ├─ mod.rs            aplica o DisplayMode
│  ├─ notch.rs  tray.rs  orb.rs  dock.rs  hub.rs
│  └─ geometry.rs       cálculos puros de posição (testáveis)
└─ state.rs             estado compartilhado
```

## Eventos (backend → frontend)

Nomes no formato `ekko://<domínio>/<evento>`, por exemplo `ekko://assistant/state`, `ekko://display/mode-changed`, `ekko://timer/tick`.

## Decisões (ADRs)

Decisões relevantes ficam em `docs/adr/NNNN-titulo.md` (contexto → decisão → consequências).
