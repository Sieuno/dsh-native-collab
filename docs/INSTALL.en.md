# Installation and Usage Guide

Trial build. Full tests, real-Profile, and real-LLM-task validation are not complete; the declared compatibility range does not imply verified support. Compatible with DSH `>=0.2.1-rc.1 <0.2.2-0` and Node `>=22.19.0`.

## 1. Installation & Activation

1. Install into the Profile you actually use; there is no need to stop the running instance first (installation only writes dependencies into that Profile). Replace `<profile>` with your Profile name (the GUI default is usually `web`):

```sh
dsh plugin --profile <profile> add @sieuno/dsh-native-collab
```

When using a local or offline package, replace the package name with the path to the TGZ file.

2. Close and restart that Profile, then open the plugin management page. When upgrading over a currently running older version, close that instance first to avoid Windows file locks.

## 2. Configuration & Automatic Saving

- **Automatic Saving**: All changes save automatically without manual save buttons; errors appear beside the affected item.
- **No Manual Editing**: Standard configuration changes need no file editing and no service switching.
- **Activation Lifecycle**:
  - **Model Source**: Applies immediately to subsequent queries and agent creation.
  - **Startup Settings**: Enhancement toggles and consecutive automatic wake-up limit take effect after a normal Profile restart (browser refresh alone is not a restart).

## 3. Core Architecture

- **Single Management Entry**: The patch inserts only one management entry managing three backend services. Disabling this entry restores native services on restart.
- **Preset Adaptation**: Dynamically adapts tools in memory for known AgentPresets without modifying preset files; unknown custom providers remain untouched. Root tools from experimental packages remain disabled.
- **Consecutive Automatic Wake-up Limit**:
  - Default: 32 rounds shared across the Team family to prevent infinite loops.
  - Only counts uninterrupted cross-session automatic wake-ups and messages without user input.
  - Any human input in a related session resets the count immediately; in-memory count resets on restart.
  - Task completion/stop reports to direct parent or Team Lead are exempt.
- **Task Progress**: View progress in originating conversation's Team panel or task card.

## 4. Uninstallation

Removing the plugin automatically removes the patch and restores native services. Normal use needs no manual config editing. If DSH fails to start after uninstalling, disabling, or changing versions (usually because a `*.patch.json` external startup overlay under the Profile directory still references this plugin), follow the startup recovery steps in the [FAQ](FAQ.md); never clear the whole patch or delete session data.
