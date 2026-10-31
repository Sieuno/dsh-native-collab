# Installation and Usage Guide

Starting with **0.3.1**, **one package** supports the DSH 0.2.1 (from rc.1) and 0.2.2 series, including prereleases; the package declares `>=0.2.1-rc.1 <0.2.2-0 || >=0.2.2-0 <0.2.3-0`. Versions 0.3.0 and earlier support only the 0.2.1 series. The plugin requires Node `>=22.19.0`; when using DSH 0.2.2, you must also meet the host requirement of Node `>=24.9.0`. The plugin floor does not lower the host requirement. Locked CI versions provide reproducible regression checks, not a ceiling on series support; see [Testing](../TESTING.md) for the distinction between test coverage and real-Host acceptance.

## 1. Installation & Activation

**Prerequisite**: enable the official experimental Agent Teams bundle (`@deepseek-ai/dsh-experimental-agent-team-profile`) in the same Profile to provide the native service entries required for managed takeover. A default Web Profile may not include it. The plugin refuses missing or duplicate native providers; do not exempt unknown host versions to force activation.

1. Install into the Profile you actually use; there is no need to stop the running instance first (installation only writes dependencies into that Profile). Replace `<profile>` with your Profile name (the GUI default is usually `web`):

```sh
dsh plugin --profile <profile> add @sieuno/dsh-native-collab
```

When using a local or offline package, replace the package name with the path to the TGZ file.

2. Close and restart that Profile, then open the plugin management page. When upgrading over a currently running older version, close that instance first to avoid Windows file locks.

## 2. Configuration & Automatic Saving

- **Subagent Settings**: When the native settings page is unavailable, this plugin edits its settings on its behalf. Depth and parallelism load automatically; valid changes save back to the original `subagent` entry in this Profile, without a separate copy. Existing depth rules are unchanged; subsequent admission and native services use the same configuration.
- **Automatic Saving**: Subagent settings and enhancement preferences save automatically; errors appear beside the affected section. No manual reload or save button is needed.
- **No Manual Editing**: Standard configuration changes need no file editing and no service switching.
- **Activation Lifecycle**:
  - **Model Source**: Applies immediately to subsequent queries and agent creation.
  - **Startup Settings**: Enhancement toggles and consecutive automatic wake-up limit take effect after a normal Profile restart (browser refresh alone is not a restart).

## 3. Core Architecture

- **Single Management Entry**: The patch inserts only one management entry managing three backend services. Disabling this entry restores native services on restart.
- **Preset Adaptation**: Dynamically adapts tools in memory for known AgentPresets without modifying preset files; unknown custom providers remain untouched. Root tools from experimental packages remain disabled.
- **Consecutive Automatic Wake-up Limit**:
  - Default: 32 rounds shared by all Agents associated with the session to prevent infinite loops.
  - Only counts uninterrupted cross-session automatic wake-ups and messages without user input.
  - Any human input in a related session resets the count immediately; in-memory count resets on restart.
  - Task completion/stop reports to direct parent or Team Lead are exempt.
- **Task Progress**: View progress in originating conversation's Team panel or task card.

## 4. Uninstallation

Before uninstalling, disable the plugin, restart the same Profile, and confirm that native services have been restored; then remove the plugin. Normal uninstallation removes the plugin patch. Normal use needs no manual config editing. If DSH fails to start after uninstalling, disabling, or changing versions (usually because a `*.patch.json` external startup overlay under the Profile directory still references this plugin), follow the startup recovery steps in the [FAQ](FAQ.md); never clear the whole patch or delete session data.
