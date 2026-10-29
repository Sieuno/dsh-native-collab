/**
 * Continuation integration markers and host adapters outside the public
 * Service Definition and model-facing Agent messaging contract.
 * @module @deepseek-ai/dsh-subagent/internal
 */

export { projectionDisposer, readProjectionState } from './projection-compat.ts'

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ContentBlock, MessageId, MessageSource } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import type SubagentRuntime from './index.ts'
import type { SubagentDelivery } from './control-types.ts'

/** Process-stable identity carried only by the standard adjacent-Agent messaging tool. */
export const adjacentAgentSendMessageTool = Symbol.for('dsh.subagent.adjacentAgentSendMessageTool')

/**
 * Mark the standard adjacent-Agent messaging tool without changing its model-visible schema.
 * @param definition - the standard `send_message` definition.
 * @returns the same definition with its internal identity installed.
 */
export function markAdjacentAgentSendMessageTool(definition: ToolDefinition): ToolDefinition {
  Object.defineProperty(definition, adjacentAgentSendMessageTool, { value: true })
  return definition
}

/**
 * Test whether one visible definition is the standard adjacent-Agent messaging tool.
 * @param definition - the scope-resolved `send_message` candidate.
 * @returns whether the definition carries the internal standard-tool identity.
 */
export function isAdjacentAgentSendMessageTool(definition: ToolDefinition | undefined): boolean {
  return definition !== undefined
    && (definition as ToolDefinition & { [adjacentAgentSendMessageTool]?: true })[adjacentAgentSendMessageTool] === true
}

/**
 * Process-stable symbol-keyed host delivery shared by the bundled runtime
 * entry and this unbundled internal subpath.
 * @internal
 */
export const deliverSubagentPrompt = Symbol.for('dsh.subagent.deliverPrompt')

/** Runtime face required by the host-only prompt adapters. */
export interface HostPromptDeliverer {
  [deliverSubagentPrompt](
    parent: Agent,
    childId: SessionId,
    content: ContentBlock[],
    source: MessageSource,
    signal: AbortSignal,
    delivery: SubagentDelivery,
  ): Promise<MessageId>
}

/**
 * Queue one host-protocol message without exposing another Service operation.
 * @param runtime - subagent runtime owning continuation residency.
 * @param parent - exact live direct parent authorizing delivery.
 * @param childId - durable direct-child session id.
 * @param content - host-authored content to deliver.
 * @param source - durable host-protocol source descriptor.
 * @param signal - caller cancellation before inbox acceptance.
 * @returns the accepted message's inbox id.
 */
export function queueHostSubagentPrompt(
  runtime: SubagentRuntime,
  parent: Agent,
  childId: SessionId,
  content: ContentBlock[],
  source: MessageSource,
  signal: AbortSignal,
): Promise<MessageId> {
  return (runtime as unknown as HostPromptDeliverer)[deliverSubagentPrompt](
    parent,
    childId,
    content,
    source,
    signal,
    'queue',
  )
}

/**
 * Steer one host-protocol message without exposing another Service operation.
 * @param runtime - subagent runtime owning continuation residency.
 * @param parent - exact live direct parent authorizing delivery.
 * @param childId - durable direct-child session id.
 * @param content - host-authored content to deliver.
 * @param source - durable host-protocol source descriptor.
 * @param signal - caller cancellation before inbox acceptance.
 * @returns the accepted message's inbox id.
 */
export function steerHostSubagentPrompt(
  runtime: SubagentRuntime,
  parent: Agent,
  childId: SessionId,
  content: ContentBlock[],
  source: MessageSource,
  signal: AbortSignal,
): Promise<MessageId> {
  return (runtime as unknown as HostPromptDeliverer)[deliverSubagentPrompt](
    parent,
    childId,
    content,
    source,
    signal,
    'steer',
  )
}

/** Process-stable internal identity-transition operation; absent from the Service schema. */
export const withIdleContinuableInternal = Symbol.for('dsh.subagent.withIdleContinuable')
/** Process-stable fail-closed identity-transition assertion for Team callers. */
export const assertNoIdentityTransitionInternal = Symbol.for('dsh.subagent.assertNoIdentityTransition')
/** Capture a resolved route before any asynchronous work can stale its identity. */
export const captureIdentityTransitionGenerationInternal = Symbol.for('dsh.subagent.captureIdentityTransitionGeneration')
/** Recheck the captured route at its final admission boundary. */
export const assertIdentityTransitionGenerationInternal = Symbol.for('dsh.subagent.assertIdentityTransitionGeneration')
/** Block ordinary delivery while a durable identity transition needs recovery. */
export const setIdentityRecoveryInternal = Symbol.for('dsh.subagent.setIdentityRecovery')

/** Runtime face shared only by internal Host adapters. */
interface IdentityTransitionRuntime {
  [withIdleContinuableInternal]<T>(
    parent: Agent,
    childId: SessionId,
    operation: (child: Agent, signal: AbortSignal) => Promise<T>,
  ): Promise<T>
  [assertNoIdentityTransitionInternal](childId: SessionId): void
  [captureIdentityTransitionGenerationInternal](childId: SessionId): number
  [assertIdentityTransitionGenerationInternal](childId: SessionId, generation: number): void
  [setIdentityRecoveryInternal](childId: SessionId, blocked: boolean): void
}

/**
 * Hold an idle direct local continuable child through one identity transition.
 * The callback's signal composes the parent teardown and Agent maintenance lease.
 */
export function withIdleContinuable<T>(
  runtime: unknown,
  parent: Agent,
  childId: SessionId,
  operation: (child: Agent, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const candidate = runtime as IdentityTransitionRuntime | undefined
  if (candidate === undefined || typeof candidate[withIdleContinuableInternal] !== 'function') {
    return Promise.reject(new Error('subagent runtime does not support idle identity transitions'))
  }
  return candidate[withIdleContinuableInternal](parent, childId, operation)
}

/** Fail closed when the runtime lacks the identity-transition guard. */
export function assertNoIdentityTransition(runtime: unknown, childId: SessionId): void {
  const candidate = runtime as IdentityTransitionRuntime | undefined
  const assert = candidate?.[assertNoIdentityTransitionInternal]
  if (typeof assert !== 'function') throw new Error('subagent runtime does not expose identity-transition admission')
  assert.call(candidate, childId)
}

/** Capture a Team target route generation immediately after resolving its identity. */
export function captureIdentityGeneration(runtime: unknown, childId: SessionId): number {
  const candidate = runtime as IdentityTransitionRuntime | undefined
  const capture = candidate?.[captureIdentityTransitionGenerationInternal]
  if (typeof capture !== 'function') throw new Error('subagent runtime does not expose identity-transition admission')
  return capture.call(candidate, childId)
}

/** Reject a previously resolved route after any transition began or completed. */
export function assertIdentityGeneration(
  runtime: unknown,
  childId: SessionId,
  generation: number,
): void {
  const candidate = runtime as IdentityTransitionRuntime | undefined
  const assert = candidate?.[assertIdentityTransitionGenerationInternal]
  if (typeof assert !== 'function') throw new Error('subagent runtime does not expose identity-transition admission')
  assert.call(candidate, childId, generation)
}

/** Block or repair one target after uncertain durable identity reconciliation. */
export function setIdentityRecovery(runtime: unknown, childId: SessionId, blocked: boolean): void {
  const candidate = runtime as IdentityTransitionRuntime | undefined
  const set = candidate?.[setIdentityRecoveryInternal]
  if (typeof set !== 'function') throw new Error('subagent runtime does not expose identity recovery admission')
  set.call(candidate, childId, blocked)
}
