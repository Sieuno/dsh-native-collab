/**
 * Type-only source for the build-injected conversation panel namespaces.
 * scripts/client-panels.mjs removes this import and substitutes each panel's
 * own namespace; this file supplies no runtime locale or upstream SDK shim.
 */
export const NS: 'agent-team' | 'subagent' = 'agent-team'

/** Keys statically requested by TeamAction; runtime translations remain host-owned. */
export type TeamKey =
  | 'open' | 'current' | 'model' | 'owner' | 'unowned' | 'ready' | 'blocked'
  | 'blockedBy' | 'writeScopes' | 'trigger' | 'failure' | 'roster' | 'empty' | 'tasks'
  | 'memberStatus.running' | 'memberStatus.inactive' | 'memberStatus.provisioning' | 'memberStatus.failed'
  | 'status.pending' | 'status.in_progress' | 'status.completed'
