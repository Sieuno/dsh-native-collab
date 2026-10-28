# DSH Native Collab · Native Collaboration Enhancements

**DeepSeek Harness agent collaboration enhancements (based on the original plugin)**: child Agent communication enhancements and Team model selection for DeepSeek Harness (DSH). An **unofficial community plugin** derived from DSH (not an official distribution).

[中文](https://github.com/Sieuno/dsh-native-collab/blob/main/README.md) · [Installation Guide](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/INSTALL.en.md) · [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md) · [Issues](https://github.com/Sieuno/dsh-native-collab/issues)

---

## Installation & Quick Start

Install into **the Profile you currently use**; there is no need to stop the running instance first (installation only writes dependencies into that Profile). Replace `<profile>` with your Profile name (the GUI default is usually `web`):

```sh
dsh plugin --profile <profile> add @sieuno/dsh-native-collab
```

To install from a local or offline package, replace the package name with the path to the TGZ file. After installing or upgrading, close and restart that Profile to load the new version (a browser refresh alone is not a restart); when upgrading over a currently running older version, closing that instance first is recommended to avoid Windows file locks.

After the restart, open the plugin management page:

- **Automatic Saving**: All settings changes save automatically without a save button; if saving is unconfirmed or fails, an error appears beside the affected item.
- **Activation**: Model source changes apply immediately to subsequent model queries and Agent creation; startup settings, including enhancement toggles and the consecutive automatic wake-up limit, apply after you shut down the service normally as prompted and restart the same Profile (a browser refresh alone is not a restart).
- **Uninstallation & Cleanup**: Always disable the plugin before uninstalling it. This plugin modifies DSH startup override settings; uninstalling it while it is still enabled may cause errors because DSH can no longer find the plugin. If you encounter related issues, see the recovery guide in the [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md).
- **Startup Troubleshooting**: If DSH fails to start after uninstalling or downgrading the plugin, first check whether any `*.patch.json` external startup overlay under the Profile directory still references this plugin, then clean stale rows from the Profile patch; see the [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md) for the steps.

## Main Features

| Feature | Description |
|---|---|
| Child Agent communication enhancements | The plugin settings page provides a main enhancement switch plus "accept additional instructions while working" and "allow continuing completed child conversations"; disabling enhancements retains native capabilities and permission rules. |
| Model selection for Team and child Agents | Three model sources: the child model list set at conversation start, the child model list in current DSH settings, and all models currently available in DSH; the latter two are re-read on every query or Agent creation, subject to model adapter and permission checks. |
| Consecutive automatic wake-up limit | 32 rounds by default, shared across the Team family to prevent multi-agent loops; only consecutive automatic wake-ups without user input are counted, user input or a process restart resets the count, and automatic child-task completion/stop reports are exempt. |

The plugin provides the same tools as the native client, but rewrites their implementations. This greatly improves the experience of working with child conversations/Subagents without injecting a bulky set of additional tools.

## Runtime & Adaptation Mechanism

The plugin patch inserts only one management entry, which manages three backend services. The three native root services and the management entry are mutually exclusive: enabling the entry runs the enhanced managed services; disabling it and restarting DSH restores native services.

Four collaboration tools are dynamically adapted in memory for the four known AgentPresets by module identity and ID, without modifying or pinning users' existing preset files or affecting unknown custom providers. The four root-level tools from the official experimental package remain disabled.

## Development & License

[Contributing](https://github.com/Sieuno/dsh-native-collab/blob/main/CONTRIBUTING.md) · [Testing](https://github.com/Sieuno/dsh-native-collab/blob/main/TESTING.md) · [Changelog](https://github.com/Sieuno/dsh-native-collab/blob/main/CHANGELOG.md).

Based on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), licensed under the [MIT License](https://github.com/Sieuno/dsh-native-collab/blob/main/LICENSE), with copyright and NOTICE information retained. See [UPSTREAM.md](https://github.com/Sieuno/dsh-native-collab/blob/main/UPSTREAM.md) and [THIRD_PARTY_NOTICES.md](https://github.com/Sieuno/dsh-native-collab/blob/main/THIRD_PARTY_NOTICES.md) for upstream sources and third-party notices.
