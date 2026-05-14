# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Requirements: Node.js >= 18, Docker >= 20, Yarn 1 (`packageManager: yarn@1.22.19`)
- Install dependencies: `yarn install`
- Start local web development: `yarn dev`
  - Runs the Next.js dev server and `app/masks/build.ts` in watch mode.
- Build production web app: `yarn build`
  - Generates `public/masks.json` first, then builds Next.js with `BUILD_MODE=standalone`.
- Start production server after build: `yarn start`
- Lint: `yarn lint`
- Run Jest in watch mode: `yarn test`
- Run Jest once for CI/local verification: `yarn test:ci`
- Run one test file: `yarn test:ci test/model-provider.test.ts`
- Run tests matching a name: `yarn test:ci --testNamePattern="getModelProvider"`
- Regenerate built-in masks manually: `yarn mask`
- Refresh prompt data: `yarn prompts`

## Desktop app / export commands

- Export static web build for app packaging: `yarn export`
- Run exported app in dev mode: `yarn export:dev`
- Run Tauri desktop app in dev mode: `yarn app:dev`
- Build Tauri desktop app: `yarn app:build`

## Environment and runtime notes

- Local development expects a root `.env.local`; README documents `OPENAI_API_KEY` as the minimal setup.
- Set `ENABLE_MCP=true` before building if MCP support is needed.
- `next.config.mjs` switches behavior by `BUILD_MODE`:
  - `standalone` = server deployment with Next route handlers
  - `export` = static export used by the desktop app
- In non-export builds, `next.config.mjs` also adds `/api/*` CORS headers and rewrite proxies for upstream providers.

## High-level architecture

### App shape

- This is a Next.js 14 App Router app, but the product UI is largely a client-side SPA inside `app/`.
- `app/layout.tsx` injects build/client config into a `<meta name="config">` tag, and `app/config/client.ts` reads that config on the client.
- `app/page.tsx` renders `Home`, and `app/components/home.tsx` is the main client shell.
- The shell uses `react-router-dom` with `HashRouter` for in-app navigation, so most feature screens are routed inside the client rather than through separate Next pages.

### Main UI areas

- `app/components/` contains the feature UI: chat, settings, sidebar, new chat, plugins, artifacts, MCP market, auth, and related shared UI.
- `app/components/home.tsx` dynamically loads the major screens and is the best entry point for understanding how the app is assembled.
- Global styling lives in `app/styles/`; assets and icons are primarily under `app/icons/` and `public/`.
- Localization strings live in `app/locales/`.

### State management

- Client state is built on Zustand stores under `app/store/`.
- `app/utils/store.ts` provides the shared persisted-store wrapper.
- Persisted state uses IndexedDB via `app/utils/indexedDB-storage.ts`, not plain localStorage.
- Important stores:
  - `app/store/chat.ts` manages chat sessions, messages, summarization, MCP/tool integration, and per-session model settings.
  - `app/store/config.ts` manages UI settings, model config defaults, TTS, realtime config, and merged model availability.
  - `app/store/access.ts` manages provider credentials and custom endpoint settings.
  - `app/store/plugin.ts`, `app/store/mask.ts`, `app/store/prompt.ts`, `app/store/sync.ts`, `app/store/update.ts` cover plugins, prompt masks, sync, and update flows.

### Provider and model flow

- Provider/model constants and defaults are centered in `app/constant.ts`.
- Model parsing and availability helpers live in `app/utils/model.ts`.
- `app/client/api.ts` is the provider selection layer; it chooses an `LLMApi` implementation based on the active provider.
- Provider-specific client implementations live in `app/client/platforms/*.ts`.
- Those client classes decide whether to call:
  - internal Next routes such as `/api/openai` and `/api/anthropic` for web/server deployments, or
  - upstream provider URLs directly when running as the exported/Tauri app (`getClientConfig()?.isApp`).
- Settings UI and access-store state are tightly coupled to this provider model, so provider changes usually touch `app/components/settings.tsx`, `app/store/access.ts`, `app/client/api.ts`, and the relevant platform file together.

### Server-side API layer

- The main provider route entry point is `app/api/[provider]/[...path]/route.ts`.
- That route dispatches to provider-specific handlers such as:
  - `app/api/openai.ts`
  - `app/api/anthropic.ts`
  - `app/api/google.ts`
  - `app/api/azure.ts`
  - `app/api/deepseek.ts`
  - `app/api/xai.ts`
  - and the other provider files in `app/api/`
- Shared server logic is in:
  - `app/api/common.ts`
  - `app/api/proxy.ts`
  - `app/api/auth.ts`
- Additional explicit routes exist for config, artifacts, Tencent, and WebDAV under `app/api/`.
- The catch-all provider route runs on the edge runtime.

### Configuration model

- Server environment parsing is centralized in `app/config/server.ts`.
- This file determines which providers/features are enabled from env vars, chooses API keys, applies model-related env overrides, and exposes runtime flags such as MCP enablement.
- Build metadata is created in `app/config/build.ts` and consumed through `app/config/client.ts`.
- If behavior differs between local web, deployed web, and desktop app, inspect the interaction among `app/config/server.ts`, `app/config/build.ts`, `app/config/client.ts`, and `next.config.mjs` first.

### Masks, prompts, and generated data

- Built-in prompt masks are defined under `app/masks/`.
- `app/masks/build.ts` generates `public/masks.json`.
- Dev and build scripts already run this generation step automatically; if masks look stale, regenerate with `yarn mask`.
- Prompt refresh logic lives in `scripts/fetch-prompts.mjs` and writes data used by the app.

### MCP integration

- MCP support is gated by `ENABLE_MCP=true`.
- Client/server MCP logic lives under `app/mcp/`.
- `app/components/home.tsx` initializes MCP on startup when enabled, and `app/store/chat.ts` integrates MCP tools into chat flows.

### Desktop app structure

- `src-tauri/` is the Tauri desktop wrapper; it does not implement a separate frontend.
- `src-tauri/tauri.conf.json` points Tauri at the exported web app (`../out`) and uses `yarn export` / `yarn export:dev` as its pre-build/dev commands.
- `src-tauri/src/main.rs` boots the Tauri shell and registers native commands.
- `src-tauri/src/stream.rs` contains native streaming/network support used by the desktop app.

## Tests

- Jest config is in `jest.config.ts`; the test environment is `jsdom`.
- Tests currently live under `test/` and are focused on model/provider utility behavior.
- If you are changing model selection, provider parsing, or vision-model detection, check `test/model-provider.test.ts`, `test/model-available.test.ts`, and `test/vision-model-checker.test.ts` first.

## CI / workflow hints

- GitHub Actions workflows live in `.github/workflows/`.
- There is a dedicated `test.yml`, so `yarn test:ci` is the best local approximation of CI test execution.

## Files to read first for common tasks

- New UI/interaction work: `app/components/home.tsx`, then the relevant file in `app/components/`
- Provider/model changes: `app/constant.ts`, `app/utils/model.ts`, `app/client/api.ts`, `app/client/platforms/`, `app/api/`
- Env/config issues: `app/config/server.ts`, `app/config/client.ts`, `app/config/build.ts`, `next.config.mjs`
- Chat behavior/state bugs: `app/store/chat.ts`, `app/store/config.ts`, `app/store/access.ts`
- Desktop app issues: `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/stream.rs`
