# Frequently Asked Questions (FAQ)

## How do I enable features after installation?

Configure options in the plugin management page. Subagent settings and enhancement preferences load and save automatically. Normal saves need no manual migration and do not hot-migrate running agents. Restart the Profile normally for settings that require it (browser refresh alone is not a restart).

## Why did my active conversation not change after saving?

Feature toggles and consecutive automatic wake-up limits are startup settings that take effect on restart for new sessions or turns. Model source settings apply to subsequent queries and creation. In-memory wake-up counters reset on restart.

## Why are limits missing from the native Subagent page, and how can I edit them?

Managed takeover disables the native service entry, so the native page may show only model selection. Use **Subagent settings** on this plugin’s settings page. Values load automatically and valid changes save automatically. It reads the host-composed native configuration and writes changes back to the current Profile’s `subagent` entry, without storing a separate plugin copy.

Defaults are depth 1 and parallelism 8. Depth 0 disables delegation for tools inheriting this setting; an explicit tool depth still takes precedence. Parallelism counts live and starting children across the root Agent’s recursion tree, excluding the root. Changes apply to subsequent admission; lowering capacity does not stop existing children. The automatic wake-up limit is separate.

Saving checks revisions and preserves unrelated configuration. Higher-priority overrides, ambiguous targets, and concurrent changes reject the save. Keep your draft, reload limits, and inspect the override source before retrying. Do not enable native and managed services together to restore the interface. To avoid changing other configuration through alias references, proxy settings are read-only when the native configuration subtree or its ancestors contain YAML anchors / aliases; anchors belonging only to unrelated entries remain supported.

## How do I temporarily disable HMR (Hot Module Reload)?

This is an optional local debug step that affects only DSH hot reload:

```yaml
- id: hmr
  disabled: true
```

Merge the above into your Profile's `cordis.patch.yml` and restart DSH.

## What is the difference between the three model sources?

- **Conversation Start List (Native)**: Uses the candidate model snapshot captured at conversation creation.
- **Current DSH Settings List**: Dynamically reads currently selected submodels from DSH settings on each query or creation.
- **All Available Models in DSH**: Reads all models registered in DSH (still validated against provider adapters and access permissions).

## How does switching between the management entry and native services work?

The patch inserts one management entry. When enabled, managed services run; when disabled and restarted, native root services restore automatically. Presets are adapted in memory without editing files.

## How do I recover if DSH fails to start after accidental uninstallation?

This applies only if legacy manual pins to uninstalled modules remain in configuration.

1. Stop DSH services completely, preserving configuration and logs.
2. Manually fix Profile configuration files (e.g. `cordis.patch.yml` or `cordis.yml`), removing references to uninstalled modules and restoring native root services. Also check `*.patch.json` external startup overlays under the Profile directory: stale plugin rows there break startup too, see the next section.
3. Do not clear the entire patch; keep root tools from experimental packages disabled. Restart DSH after verifying.

## What should I do when startup fails and an external startup overlay exists?

External startup overlays (`*.patch.json` files written by the local launcher under the Profile directory, such as `desktop-next.cordis.patch.json` and `desktop-next.runtime.patch.json`) take precedence over the Profile's `cordis.patch.yml`. After the plugin is uninstalled, disabled, or downgraded, stale module rows in those files make DSH fail to start. Handle them in order:

1. **Stop DSH completely** (closing the browser page is not enough); keep configuration, sessions, and usage records.
2. **Back up** the suspect `*.patch.json` overlays and the Profile's `cordis.patch.yml` (or `cordis.yml`): copy them, or rename the suspects to `*.bak` for rollback.
3. **Remove the plugin rows from the overlays**: in each `*.patch.json`, delete every row referencing `@sieuno/dsh-native-collab` or its subpaths (`/subagent`, `/agent-team`, `/tool-*`) and `dsh-native-collab-ui`. If unsure which file is guilty, rename suspects one by one and retry startup.
4. **Check the Profile patch** for the same stale rows; root `subagent`, `agent-team`, and `tool-agent-team` should be available again while the four root-level tools stay disabled. Do not clear the whole patch.
5. **Restart the same Profile** and confirm sessions open. If startup still fails and the plugin is installed, set `disabled: true` on the management entry row `dsh-native-collab-ui` and restart to return to native services, then follow the previous section.
6. **Report**: provide DSH, Node, and plugin versions, the error code, and sanitized relevant config rows; never upload a whole Profile or files containing credentials.

## What is the consecutive automatic wake-up limit? How to resume when reached?

The default limit is 32 consecutive automatic wake rounds shared by all Agents associated with the session to prevent infinite loops.
- **Counts only uninterrupted automatic interaction**: Only counts automatic messages without user intervention.
- **Reset mechanism**: Any user input in a related session resets the counter immediately; process restart also resets it.
- **Behavior at limit**: Throws `Automatic wake limit reached; message send failed.` to the sending agent without cancelling any agents. Reports to direct parent or Lead are exempt.
- **Resuming**: Send a message in any related session to reset the counter and resume.

## How to submit feedback?

Provide versions, sanitized Profile info, reproduction steps, and error logs. Obfuscate tokens, API keys, private paths, and conversation contents.
