# Ekko Hub

O Ekko ("eco") é um assistente de desktop local-first para Windows. Ele mora no topo da tela, conversa por texto e voz, usa IA grátis, local ou paga, e controla o PC.

- Roadmap e fase atual: [docs/ROADMAP.md](docs/ROADMAP.md)
- Arquitetura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Design: [docs/DESIGN.md](docs/DESIGN.md)

## Rodar

Requisitos: Node 24+, Rust estável (MSVC) e WebView2.

```bash
npm install
npm run tauri dev     # app real (notch, tray, atalho Ctrl+Shift+Espaço)
npm run dev           # galeria no navegador: http://localhost:1420 (todos os modos com mock)
```

## Checar

```bash
npm run check         # eslint + tsc + vitest
npm run rust:check    # clippy -D warnings + cargo test
```

Os dados do usuário ficam em `%APPDATA%\dev.guidev.ekko\settings.json`.
