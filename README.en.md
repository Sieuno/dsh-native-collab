# DSH Native Collab · Native Collaboration Extensions

**DeepSeek Harness agent collaboration enhancements (based on the original plugin)**: Lightweight incremental extensions built on top of the official DeepSeek Harness (DSH) collaboration system, providing dynamic model sources, tree-wide automatic message allowances, and improved delegation prompts. Licensed under the MIT License.

This project is an **unofficial community plugin** (neither an official distribution nor endorsed by DeepSeek).

[中文](README.md) · [Installation Guide](docs/INSTALL.en.md) · [FAQ](docs/FAQ.en.md) · [Testing](TESTING.md) · [Issues](https://github.com/Sieuno/dsh-native-collab/issues)

---

## Compatibility

This architecture targets **DeepSeek Harness 0.2.2-rc.2 and 0.2.2-rc.3**, requiring **Node.js ≥24.9.0**.

- **Legacy Host Compatibility**: This architecture drops support for DSH 0.2.1 and older 0.2.2-alpha / rc.1 releases. For older hosts, please continue using the published plugin release **0.3.5**.
- **Future Version Notice**: Does not claim blanket compatibility with unreviewed future prereleases or arbitrary 0.2.2 variants; future host releases require separate review.

## Architecture & Core Changes

Now that official DSH has unified the Team and Subagent collaboration tree, this project has been refactored from "replacing the entire official collaboration runtime" to **"providing lightweight incremental extensions on top of official collaboration tools"**:

- **Complete Official Core Reuse**: Directly reuses the official tools installed with the host, preserving native parameter validation, model adapter checks, authorization, member discovery, session creation, completion notifications, cold restoration, and task boards.
- **Scoped Context Interception**: Injects model policies and communication guards strictly within the local invocation context of official tools, without replacing global background services or rewriting Agent presets.
- **Removed Redundancies**: Since official Teams already support unified messaging and membership under the same collaboration tree, this release removes the former standalone Team roster, custom collaboration UI panels, and the complex Team/Subagent identity exchange system.

## Main Features

| Feature | Description |
|---|---|
| **Dynamic Model Sources** | Provides three model source modes for newly delegated child agents: `conversation` (default, retains session authorization), `settings` (re-reads current native child model settings per call), and `all` (re-reads registered providers per call, subject to official adapter validation). Applies only to fresh child delegation; fork retains official parameters and inheritance rules. |
| **Shared Automatic Message Allowance** | 32 messages by default, shared across all agents in the entire collaboration tree to prevent infinite loops. Counts only successfully delivered ordinary model messages (refunds on send failures; native completion notices do not count), and resets upon user input, question replies, or process restarts. Reports submitted via `task_result: true` to the direct parent are exempt. |
| **Concise Delegation Guidance** | Retains official system prompts while injecting lightweight delegation principles: directly handle small tasks, minimize redundant context, and coordinate when blocked; fully leverages official automatic result delivery. |
| **Native Host Settings & Panels** | Recursion depth and concurrency limits are managed natively through official subagent settings without maintaining duplicate stores; the plugin detail page provides a streamlined settings form; progress is viewed directly in official session Team panels or task cards. |

### 1. Dynamic Model Sources

The plugin provides three dynamic source modes for fresh child agent creation (`subagent` tool) and model discovery (`list_subagent_models`):

- `conversation` (default): Reuses native child model authorizations saved in the session; falls back to official parent model constraints when none are recorded.
- `settings`: Re-reads current official child model settings on each query or explicit selection, rather than substituting obsolete session lists. Rejects explicit selection when native child model selection is disabled; unselected calls follow official inheritance.
- `all`: Inspects all currently registered model providers on each call. Models published by adapters are listed; unlisted exact model IDs still require validation by official adapters before creation.

Dynamic sources do not alter authorization records stored in session history, nor do they bypass official checks for model existence, reasoning tier, or provider capabilities. `subagent_fork` strictly preserves official inheritance and configuration without injecting extra selection parameters. The settings page contains only model source and automatic wake message limit. Model source defaults to Official default policy without removing native selection capabilities.

### 2. Message Delivery

**Note**: This plugin no longer offers the model-side `queue` option (which queued messages for a later turn), and uniformly reuses official `send_message` `steer` delivery: target agents receive guidance at step boundaries, and idle targets can initiate a new turn without forcibly interrupting active model requests or tool executions (official user-side delivery still supports queuing). Passing the legacy `delivery` parameter produces an explicit error. Successful delivery indicates inbox acceptance, not that the request has already been processed or answered.

### 3. Shared Automatic Message Allowance

To prevent multi-agent loops during autonomous collaboration, the plugin enforces a tree-wide automatic message allowance:

- **Accounting Rules**: Default ceiling of **32 messages**, shared by all agents within the collaboration tree. Each ordinary model message sent via the adapted official `send_message` and accepted by the destination inbox counts as 1; failed deliveries refund the reserved count.
- **Reset Mechanism**: Any user input or user response to a question prompt resets the counter to zero; process restarts also reinitialize the counter.
- **Exhaustion Behavior**: Reaching the limit rejects only that specific outgoing message with a clear explanatory error; it does not stop, cancel, or terminate any agent, nor does it constrain subsequent user input or the agent's internal reasoning. When exhausted, agents should await human intervention rather than looping retries.
- **Result Report Exemption**: Official task completion notices do not pass through this counter and consume no allowance. In addition, child agents can submit final completed-task reports to their **direct parent** using `task_result: true`, which is exempt (ordinary messages, peer messages, or downward messages cannot abuse this flag).
- **Scope Boundary**: Guards apply solely to official model tools adapted by this plugin; third-party plugins directly calling low-level service APIs are not restricted.

## Usage Recommendations

- **Lightweight Collaboration Scope**: Designed for routine project maintenance, prototyping, and lightweight multi-role exploration. If your project requires complex team choreography or large-scale staged pipelines, consider more extensive orchestration frameworks.
- **Delegation Rhythm**: Directly process small or tightly coupled tasks with the current agent. Delegate only when division of labor provides clear benefit, avoiding unnecessary context duplication.
- **Use Native Completion Notices**: While the parent Agent remains loaded by the host, official completion notices return child results and wake an idle parent, usually without another `send_message` summary. Ending a turn does not prevent this wake-up. Completion notices do not restore a released parent instance; see the [FAQ](docs/FAQ.en.md) for the distinction.
- **Named Collaboration & Teams**: Standard child agents support custom names and tree communication; enable session-level Team mode only when you require shared task boards or persistent oversight.

## Installation & Configuration

### Installation Command

Install into the Profile you currently use:

```sh
dsh plugin --profile <profile> add @sieuno/dsh-native-collab
```

> **Note**: Before version 0.4.0 is published to npm, running the package-name command fetches the older 0.3.5 release. To test prior to release, install the built `.tgz` archive (`dsh plugin --profile <profile> add /path/to/sieuno-dsh-native-collab-0.4.0.tgz`). After official publication, the package-name command installs 0.4.0 directly.

### Activation & Workflow

1. **Restart Profile**: Restart the same Profile normally after installing, enabling, or disabling the plugin (refreshing the web browser is not a service restart).
2. **Plugin Settings Form**: Open this plugin's detail page under Plugins → Installed to configure "Subagent model source" and "Automatic wake message limit". Click Save to apply changes to subsequent tool calls immediately.
3. **Native Runtime Limits**: Maximum recursion depth, concurrency limits, Team mode toggles, and task boards are configured directly through official host settings.
4. **Disabling the plugin**: Use the package's main switch and restart the same Profile rather than disabling only its internal component.

## Upgrading & Legacy Considerations

- **Legacy Identity Exchange Records**: Older plugin releases wrote `team/member` v3 extension records into session logs. This branch does not automatically migrate those records, nor does it guarantee lossless native playback for converted sessions. **Back up your Profile configuration and session data before upgrading**, and verify in fresh sessions within an isolated Profile.
- **Stale Startup Overlays**: If DSH fails to start after upgrading or uninstalling older releases, check whether `cordis.patch.yml` in the Profile directory or launcher-generated `*.patch.json` files retain obsolete references to retired subpaths (such as `/subagent`, `/agent-team`, or `/tool-*`). Follow the [FAQ](docs/FAQ.en.md) to clean only stale entries belonging to this plugin without clearing unrelated settings.

## Testing & Validation

The local development environment (Windows / Node 24) has verified:

- 10 base contract, package manifest, and release configuration checks;
- 24 SDK and runtime integration tests per locked DSH 0.2.2-rc.2 and 0.2.2-rc.3 SDK, covering tools, Loader assembly, settings forms, and real AgentLoop / Subagent / presets / Team / JSONL persistence;
- Strict type checking across both SDK target declarations;
- Build consistency verification (`node scripts/native-build.mjs --check`) and `npm pack --dry-run` packaging checks.

*Note: Verification does not claim end-to-end acceptance against live commercial model APIs, desktop/browser DOM interactions, full installed Profile lifecycles, or legacy session migration. See [TESTING.md](TESTING.md) for tiered evidence boundaries.*

## License & Notices

[Contributing](CONTRIBUTING.md) · [Testing](TESTING.md) · [Changelog](CHANGELOG.md).

Derived from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), licensed under the [MIT License](LICENSE), with original copyrights and NOTICE preserved. See [UPSTREAM.md](UPSTREAM.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for upstream source notices.
