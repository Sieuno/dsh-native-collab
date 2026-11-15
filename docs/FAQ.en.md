# Frequently Asked Questions (FAQ)

## Why are the custom Team panel and "identity conversion" gone?

In DSH `0.2.2-rc.2 / rc.3`, the official architecture fully unified Teams with Subagents. All team members are now managed natively within the Subagent tree, complete with built-in member discovery, task boards, and session Team mode.

Instead of replacing or duplicating these official services, this plugin embraces the official native infrastructure. The old identity-conversion mechanism is replaced by the official member model. The plugin provides model-source selection, an automatic message allowance to prevent loops, and improved delegation prompts.

## How are settings saved? Why is there no custom autosave UI?

Go to **Plugins → Installed** and open this plugin's detail page to access the settings form (featuring "Subagent model source" and "Automatic wake message limit").

The form uses official UI components and the configuration service. After adjusting options, click **Save** at the bottom; changes take effect immediately on subsequent tool calls. This replaces the legacy field-by-field autosave that was prone to concurrent save conflicts.

> [!NOTE]
> Enabling or disabling the entire plugin still requires a full restart of the DSH instance for that Profile.

## Where did the direct-child communication toggles go?

The toggles restricting communication to running or idle direct children have been removed.

Messaging between agents in the collaboration tree now fully adheres to standard native behavior, eliminating redundant barriers that could block legitimate workflows. Any leftover legacy switches in saved configurations are safely ignored and will not prevent message delivery.

## What does "Official default policy" mean for model sources?

Subagents use DSH's official session model authorization. Model selection and session-forking inheritance remain available. This is also the plugin's default choice.

## Will reaching the automatic message allowance terminate the Agent?

**No, agents are not terminated.**

When the allowance is exhausted, only that specific automated message is rejected—the agent keeps running. This limit exists to prevent autonomous multi-agent loops from running indefinitely:
- Any human message or reply to a question immediately **resets the allowance** for the entire collaboration tree.
- Subagents reporting task results to their direct parent (with `task_result: true`) **do not consume allowance**.
- Official native task completion notifications are exempt from this limit.
- Failed message sends automatically refund reserved allowance.

## Why is model-side `queue` delivery no longer offered?

The plugin reuses official `send_message` steer delivery: working targets receive messages at step boundaries, and idle targets can start a turn. It does not forcibly interrupt an in-flight model request or tool call.

The former `queue` option queued a message for a later turn; it did not force an interruption. This plugin chose to remove model-side `delivery` selection. Official user-side delivery still supports queuing, so this is not an upstream removal of `queue`. Passing the old `delivery` argument to the adapted model tool returns an error.

## Can a child Agent wake its parent?

Yes. An "online parent" means its Agent instance remains loaded by the host, including while idle:

- **Idle or between turns**: An automatic completion notice can wake the parent and start a turn. A working parent receives it at a step boundary.
- **Released instance**: Automatic completion notices do not cold-restore a parent just to report results. In nested delegation, an intermediate child may finish and be released while its descendants continue working.
- **Explicit `send_message`**: While the collaboration root (Lead) remains loaded, official messaging can cold-restore a released parent conversation if it is a continuable member of the same tree. This differs from automatic completion reporting.

Ending a turn to wait for results is normal; the parent does not need to keep generating or polling to remain wakeable.

## What should I do if DSH fails to start after upgrading or uninstalling?

If DSH crashes on startup after an upgrade or removal, stale startup patches from the old version may still be present. Follow these steps to resolve:
1. **Fully stop DSH** and back up your Profile configuration folder.
2. Open `cordis.patch.yml` (and any launcher-generated `*.patch.json` files) in that Profile directory.
3. Search for references to `@sieuno/dsh-native-collab` or retired subpaths (e.g. `/subagent`, `/agent-team`).
4. **Remove only the stale entries related to this plugin**, leaving other plugins and base configurations intact (do not delete or empty the entire file).
5. Save and restart DSH, then check whether official collaboration services recover. If startup still fails, keep the specific error and investigate other configuration or dependency issues.
