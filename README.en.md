# DSH Native Collab · Native Collaboration Enhancements

**DeepSeek Harness agent collaboration enhancements (based on the original plugin)**: child Agent communication enhancements and Team model selection for DeepSeek Harness (DSH). An **unofficial community plugin** derived from DSH (not an official distribution).

[中文](https://github.com/Sieuno/dsh-native-collab/blob/main/README.md) · [Installation Guide](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/INSTALL.en.md) · [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md) · [Issues](https://github.com/Sieuno/dsh-native-collab/issues)

---

## Compatibility

Starting with **0.3.1**, a single plugin package supports the DSH **0.2.1 (from rc.1) and 0.2.2 series, including prereleases**. Versions 0.3.0 and earlier support only the 0.2.1 series. The plugin requires Node.js ≥22.19.0; when using DSH 0.2.2, you must also meet the host requirement of Node.js ≥24.9.0.

## Installation & Quick Start

Install into **the Profile you currently use**; there is no need to stop the running instance first (installation only writes dependencies into that Profile). Replace `<profile>` with your Profile name (the GUI default is usually `web`):

```sh
dsh plugin --profile <profile> add @sieuno/dsh-native-collab
```

Restart DSH after enabling or disabling the plugin for the change to take effect.

After the restart, open the plugin management page:

- **Automatic Saving**: All settings changes save automatically without a save button; if saving is unconfirmed or fails, an error appears beside the affected item.
- **Activation**: Model source changes apply immediately to subsequent model queries and Agent creation; startup settings, including enhancement toggles and the consecutive automatic wake-up limit, apply after you shut down the service normally as prompted and restart the same Profile (a browser refresh alone is not a restart).
- **Uninstallation & Cleanup**: Disable the plugin first, then restart the same Profile and confirm that native services have been restored before uninstalling. If startup overlays still reference the plugin, uninstalling it directly may prevent DSH from starting because the plugin can no longer be found. See the recovery steps in the [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md).
- **Startup Troubleshooting**: If DSH fails to start after uninstalling or downgrading the plugin, first check whether any `*.patch.json` external startup overlay under the Profile directory still references this plugin, then clean stale rows from the Profile patch; see the [FAQ](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.en.md) for the steps.

## Main Features

| Feature | Description |
|---|---|
| Child Agent communication enhancements | The plugin settings page provides a main enhancement switch plus "accept additional instructions while working" and "allow continuing completed child conversations"; disabling enhancements retains native capabilities and permission rules. |
| Model selection for Team and child Agents | Three model sources: the child model list set at conversation start, the child model list in current DSH settings, and all models currently available in DSH; the latter two are re-read on every query or Agent creation, subject to model adapter and permission checks. |
| Consecutive automatic wake-up limit | 32 rounds by default, shared by all Agents associated with the session to prevent multi-agent loops; only consecutive automatic wake-ups without user input are counted, user input or a process restart resets the count, and automatic child-task completion/stop reports are exempt. |

The plugin provides the same tools as the native client, but rewrites their implementations. This greatly improves the experience of working with child conversations/Subagents without injecting a bulky set of additional tools.

## Usage Recommendations

This plugin suits lightweight collaboration such as prototyping, routine project maintenance, and personal development. Choose a collaboration approach based on task dependencies and coordination complexity, not project size alone. If you need more elaborate team organization and workflows, consider a more comprehensive solution such as [dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams).

The plugin retains the official collaboration system's task assignment and division of responsibilities, enhancing existing tools rather than adding a large new toolset. Start with a capable **Lead + role-specific Subagents**, choose suitable models for each role, and define responsibilities, inputs, deliverables, and acceptance criteria. Use Team when you need long-lived named members, ongoing collaboration, or a shared task board. Share your experiences in Discussions!

## Runtime & Adaptation Mechanism

The plugin patch inserts only one management entry, which manages three backend services. The three native root services and the management entry are mutually exclusive: enabling the entry runs the enhanced managed services; disabling it and restarting DSH restores native services.

Four collaboration tools are dynamically adapted in memory for the four known AgentPresets by module identity and ID, without modifying or pinning users' existing preset files or affecting unknown custom providers.

Service switching uses DSH's Profile patch mechanism; this plugin does not append a `--override` startup argument. When the management entry is enabled, the patch disables the three corresponding native root services to avoid running duplicate providers alongside the enhanced services. The four root-level tools from the official experimental package remain disabled. If a local launcher generates additional external startup overlays, check them for stale references as described in the FAQ.

## Development & License

[Contributing](https://github.com/Sieuno/dsh-native-collab/blob/main/CONTRIBUTING.md) · [Testing](https://github.com/Sieuno/dsh-native-collab/blob/main/TESTING.md) · [Changelog](https://github.com/Sieuno/dsh-native-collab/blob/main/CHANGELOG.md).

Based on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), licensed under the [MIT License](https://github.com/Sieuno/dsh-native-collab/blob/main/LICENSE), with copyright and NOTICE information retained. See [UPSTREAM.md](https://github.com/Sieuno/dsh-native-collab/blob/main/UPSTREAM.md) and [THIRD_PARTY_NOTICES.md](https://github.com/Sieuno/dsh-native-collab/blob/main/THIRD_PARTY_NOTICES.md) for upstream sources and third-party notices.
