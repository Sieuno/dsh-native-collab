# Real CI SDK supply

This private, independent npm project supplies real published DSH runtime modules and declarations. It does not alter the plugin manifest or lockfile and does not install a Host. All direct dependencies are exact; the npm lockfile pins transitive versions and tarball integrity. DSH packages target upstream `dsh-v0.2.1-rc.2` (`687f282e8625c6b8d11ff58211a90524be2e4317`). No SDK implementation or declaration is fabricated or rewritten.

## Run from the repository root

```sh
npm ci --ignore-scripts --legacy-peer-deps
node scripts/ci/prepare-sdk.mjs
DSH_HOST_CONTRACT=require node scripts/emit-dist.mjs --check
npm run check:types
npm run check:load
npm run test:sdk
```

PowerShell: set `$env:DSH_HOST_CONTRACT="require"` before the emit command. Windows requires PowerShell 7 (`pwsh`); native directory junctions need no Developer Mode or elevation, and both synchronous and asynchronous Node resolution are verified. Linux uses ordinary directory symlinks and needs no special privilege. Use Node >=22.19 with permission-model/registerHooks support. The preparer calls `npm ci --ignore-scripts --legacy-peer-deps` in this directory with inherited stdio (no child pipes) and a repository-local cache. `--no-install` only relinks/verifies an existing lockfile installation; use the default for CI.

Only explicit direct packages are linked into root `node_modules`, including real `@types/node` and `js-yaml`. Existing packages are replaced only if their name and exact version agree. Re-run the preparer after a root `npm ci`. Cordis 4.0.5, Schemastery 3.18.5 and zod 4.4.3 are overridden and checked to resolve to one physical installation from every direct SDK package. The zod version deliberately matches the plugin root dependency. Optional Host peers are not auto-installed. Settings, ConfigEditor and AppBoot are never linked and must remain unresolvable from the root. The published agent-preset-registry depends on AppBoot internally; that transitive copy stays private inside this independent SDK installation and is not a running Host.

## Scope

SDK integration, strict plugin-source typechecking and isolated module loading are not a real Host/renderer/model acceptance test. The source settings contract additionally needs a caller-supplied matching official checkout via `DSH_SOURCE_ROOT`; this installer does not fetch or expose Settings/ConfigEditor/AppBoot. Official client ASAR and discovery/source tests have separate prerequisites. No paid model or live Profile is used.
