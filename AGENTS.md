# Ekko Hub: regras do projeto

Assistente de desktop local-first para Windows (Tauri 2 + React 19 + workspace Rust).
Leia antes de mexer: `docs/ROADMAP.md` (fase atual), `docs/ARCHITECTURE.md` e `docs/DESIGN.md`.

## Architecture
- O núcleo fica em `crates/` (reutilizado pelo servidor da v2). `apps/desktop/src-tauri` é uma casca fina: IPC, janelas e tray, sem regra de negócio.
- Modos de exibição (notch, tray, orb, dock, hub, voice-only): cada um é uma janela Tauri com label própria, e `src/main.tsx` escolhe a superfície pela label. A geometria fica em `src-tauri/src/display/geometry.rs` (pura e testada).
- O frontend só fala com o backend via `src/lib/ipc`. O backend `mock` atende a galeria no navegador e o protótipo da F1.
- Toda capacidade do assistente é uma Tool com nível de risco (`Safe|Confirm|Dangerous`), confirmação conforme a autonomia e log de auditoria.
- Cores só via tokens (`src/theme/tokens.css`). A persona troca a paleta por `data-persona` no `<html>`.
- Segredos no Windows Credential Manager, nunca em JSON. Dados do usuário em `%APPDATA%\ekko-hub`.

## Conventions
- Código e títulos de commit em inglês; UI e corpo do commit em pt-BR. Conventional Commits.
- Arquivos com menos de ~300 linhas; comentários curtos (o porquê). Decisões grandes vão em `docs/adr/`.
- Antes de concluir: `npm run check` (lint + typecheck + vitest) e `cargo clippy --workspace -- -D warnings` + `cargo test --workspace`.
- Package manager: npm.
