/**
 * Typed failures shared by subagent service and provider operations.
 *
 * The class is the official `SubagentError`, not a second copy. Derived and
 * baseline `instanceof` checks therefore see one identity.
 *
 * @module @dsh-native-collab/subagent/error
 */
export { SubagentError } from '@deepseek-ai/dsh-subagent';
