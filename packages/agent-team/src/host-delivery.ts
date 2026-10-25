/**
 * Capability probe for the replacement subagent host adapter.
 * The brand and the typed guard live in `@dsh-native-collab/subagent`.
 * This file does not import `@deepseek-ai/dsh-subagent/internal` and does not
 * duplicate the brand symbol. The returned method stays unbound: the caller
 * supplies `this` with `deliver.call(runtime, ...)`.
 */

import { isCollabHostDelivery } from '@dsh-native-collab/subagent'
import type { CollabHostDelivery } from '@dsh-native-collab/subagent'

/**
 * Read `deliverHostPrompt` when the live runtime passes the public guard.
 * @param runtime - the `subagents` service object.
 * @returns the unbound host method, or undefined when the adapter is absent.
 */
export function hostDeliverPrompt(runtime: object): CollabHostDelivery['deliverHostPrompt'] | undefined {
  if (!isCollabHostDelivery(runtime)) return undefined
  return runtime.deliverHostPrompt
}

/**
 * Whether the live runtime currently accepts selected delivery.
 * @param runtime - typically `ctx.get('subagents')`.
 * @returns true only when the typed guard matches and the capability flag is true.
 */
export function modelDeliverySelectionEnabled(runtime: unknown): boolean {
  return isCollabHostDelivery(runtime) && runtime.modelDeliverySelection
}
