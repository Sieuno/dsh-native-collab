# Installation and Upgrade Guide

### Requirements
- **DeepSeek Harness**: `0.2.2-rc.2` or `0.2.2-rc.3`
- **Node.js**: `≥ 24.9.0`
- **Older Host Versions**: If you are using a DSH version earlier than `0.2.2-rc.2`, please continue using plugin version `0.3.5`.

---

### Installation Steps

#### 1. Install the Plugin
- **From npm registry (once officially released)**:
  ```sh
  dsh plugin --profile <profile-name> add @sieuno/dsh-native-collab
  ```
- **From a local test package (.tgz)**:
  ```sh
  dsh plugin --profile <profile-name> add /path/to/sieuno-dsh-native-collab-0.4.0.tgz
  ```

#### 2. Restart DSH
After installing, enabling, or disabling the plugin, **fully close and restart the DSH instance for that Profile**. Refreshing the browser page does not reload background plugin services.

To disable the plugin, use the package's main switch rather than switching off only its "Native collaboration extensions" component. DSH withdraws the package's patch layer and added dependencies when the whole package is disabled; disabling an individual component leaves that layer in place. The plugin no longer includes a `fallback` component.

#### 3. Configuration & Usage
After restarting, open this plugin's detail page under Plugins → Installed. The form contains "Subagent model source" and "Automatic wake message limit". Model source defaults to "Official default policy". Click Save to apply changes to subsequent tool calls immediately.
> [!NOTE]
> Subagent maximum depth, concurrency limits, Team mode, and task boards are managed directly via official native controls.

---

## Upgrading from Older Versions (0.3.5 and earlier)

Older versions of this plugin replaced official collaboration services entirely, whereas the new version is rebuilt as a **lightweight native extension on top of official services**. To ensure a smooth transition, follow these recommendations:

1. **Backup**: Back up your Profile configuration and important session data before upgrading.
2. **Try in a Fresh Profile First**: We recommend testing new sessions in a separate or fresh Profile.
3. **Upgrade Steps for Existing Profiles**:
   - First, **disable the old plugin** in your Profile, then **fully restart DSH**;
   - Confirm that official native subagents and collaboration features work properly;
   - Install the new version (or local .tgz package) and restart DSH once more.
4. **Historical Session Data**:
   - Historical custom team records created by the old version's identity-conversion mechanism cannot be automatically migrated to the native subagent tree. We recommend starting new sessions for multi-agent workflows.
   - Retired custom exports (such as `/subagent`, `/agent-team`, and `/tool-*`) are no longer provided.
   - If DSH fails to start after upgrading or uninstalling, refer to the [FAQ](FAQ.en.md) to clean up leftover plugin startup overrides.
