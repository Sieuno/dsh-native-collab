# Native Collaboration Extensions

This plugin provides subagent model-source selection, a shared automatic message allowance, and improved delegation prompts.

### Configuration & Applying Changes
Adjust the options below and click Save. Changes apply to subsequent calls.

### Subagent Model Source

- **Official default policy** (default): Use the current session's child-model authorization.
- **Current child-model settings**: Read the available child models from DSH settings on each selection.
- **All registered model providers**: Choose models from all currently configured providers.

Applies only to new subagents. Forked sessions retain their existing model inheritance rules.

### Automatic Wake Message Limit

- Default limit is **32 messages**, shared across all agents in the collaboration tree to prevent infinite loops during autonomous execution.
- Only successfully accepted standard model messages count against this limit (failed sends are automatically refunded, and official task completion notices are exempt).
- The limit resets immediately whenever a user inputs a message or answers a question; restarting the instance also resets the counter.
- When the limit is reached, only that specific message send is rejected without stopping or canceling the agent. Completed-task reports to the direct parent do not consume the allowance.

### Other Settings
Subagent recursion depth and concurrency limits should be configured directly in official Subagent settings. Session-level Team mode and the task board are accessed directly via the official conversation interface.
