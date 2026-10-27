# DSH Native Collab

**DeepSeek Harness agent collaboration enhancements (based on the original plugin)**: child Agent communication enhancements and Team model selection for DeepSeek Harness (DSH). An unofficial community plugin derived from DeepSeek Harness. [中文](https://github.com/Sieuno/dsh-native-collab/blob/main/README.md).

**Status**: Trial build. Full tests, real-Profile, and real-LLM-task validation are not complete. Supported DSH and Node ranges live in the [installation guide](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/INSTALL.en.md); a declared range does not imply verified support.

[Installation Guide](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/INSTALL.en.md) · [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md) · [Issues](https://github.com/Sieuno/dsh-native-collab/issues)

---

## Installation & Setup

Install into the Profile you actually use; there is no need to stop the running instance first (installation only writes dependencies into that Profile). Replace `<profile>` with your Profile name (the GUI default is usually `web`):

```sh
dsh plugin --profile <profile> add @sieuno/dsh-native-collab
```

To install from a local or offline package, replace the package name with the path to the TGZ file. After installing or upgrading, close and restart that Profile to load the new version (a browser refresh alone is not a restart); when upgrading over a currently running older version, close that instance first to avoid Windows file locks.

After the restart, open the plugin management page:

- **Automatic Saving**: All changes save automatically without manual save buttons; errors appear beside the affected item.
- **Activation**: Model source changes apply immediately to subsequent queries and creation; feature toggles and wake-up limits take effect after restarting the Profile as prompted (refreshing the browser page does not count as a restart).
- **Uninstallation**: Removing the plugin removes the patch and restores native services. If manual entries were previously pinned, see the recovery guide in the [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md).
- **Startup Recovery**: If DSH fails to start after uninstalling or downgrading the plugin, check whether a `*.patch.json` external startup overlay under the Profile directory still references this plugin, then clean stale rows from the Profile patch; see the [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md).

## Main Features

| Feature | Description |
|---|---|
| Child Agent communication | A main enhancement switch plus "accept additional instructions while working" and "allow continuing completed conversations"; disabling it retains native capabilities and permissions. |
| Model selection for Team and subagents | Three model sources: the model list captured at conversation start, the list in current DSH settings, and all models currently available; the latter two are re-read on every query or agent creation under provider adapters and permission checks. |
| Consecutive automatic wake-up limit | 32 rounds by default, shared across the Team family to stop multi-agent loops; only uninterrupted automatic wake-ups without human input are counted, human input or a process restart resets it, and completion/stop reports to the direct parent or Team Lead are exempt. |
| One entry hosting three backend services | Subagent service, Team service, and Team tools are hosted by a single management entry that is mutually exclusive with native root services; disabling the entry and restarting the Profile restores native. |
| Four collaboration tools adapted in memory | control/list/spawn/fork are adapted for the four known AgentPresets by module identity and ID without modifying or pinning user preset files and without touching unknown custom providers; root tools from the experimental package stay disabled. |
| Read-only diagnostics | Shows each component's current state and runtime phase, model source, and assembly diagnosis (native / managed / mixed / unknown) read-only; nothing writes to the Profile online. |
| Autosave and bilingual UI | Settings save automatically and report failures next to the affected field; the UI follows the DSH language between Chinese and English. |
| Native restore and troubleshooting | Removing the plugin removes the patch and restores native root services; if DSH fails to start after uninstall or downgrade, follow the FAQ to check external startup overlays and stale patch rows. |

View progress and results in the originating conversation's Team panel or task card; the settings page is not a live monitoring dashboard.

## Architecture & Integration

The patch inserts only one management entry that manages three backend services. Native root services are mutually exclusive with the management entry: when enabled, managed services run; when disabled, native root services are restored upon restart.

Four tools are adapted in memory for the four known AgentPreset IDs and module identities without pinning or rewriting preset files, and unknown custom providers remain untouched. Root tools from experimental packages remain disabled.

## Development & License

[Contributing](https://github.com/Sieuno/dsh-native-collab/blob/main/CONTRIBUTING.md) · [Testing](https://github.com/Sieuno/dsh-native-collab/blob/main/TESTING.md) · [Changelog](https://github.com/Sieuno/dsh-native-collab/blob/main/CHANGELOG.md).

Derived from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), licensed under [MIT](https://github.com/Sieuno/dsh-native-collab/blob/main/LICENSE). See [Upstream](https://github.com/Sieuno/dsh-native-collab/blob/main/UPSTREAM.md) and [Third-party notices](https://github.com/Sieuno/dsh-native-collab/blob/main/THIRD_PARTY_NOTICES.md).
