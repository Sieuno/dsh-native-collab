/** Internal browser transport vocabulary. No model tool or actor-proof policy. */
import type { Agent } from '@deepseek-ai/dsh-agent'
export const membershipUiPort = Symbol.for('@sieuno/dsh-native-collab.membershipUi')
export const membershipObserver = Symbol.for('@sieuno/dsh-native-collab.membershipObserver')
export const membershipMessageAdmission = Symbol.for('@sieuno/dsh-native-collab.membershipMessageAdmission')

/** Check historical Team aliases before scoped routing can fall through to Subagent. */
export function assertTeamMessageIdentity(value: unknown, caller: Agent, target: string): void {
  if (typeof value !== 'object' || value === null || !(membershipMessageAdmission in value)) return
  const admit = value[membershipMessageAdmission]
  if (typeof admit !== 'function') throw new Error('invalid Team message identity admission')
  admit(caller, target)
}

/** Runtime tool reconciliation, not a new model tool or named service method. */
export function observeTeamMembership(value: unknown, listener: (agent: Agent) => void): () => void {
  if (typeof value !== 'object' || value === null || !(membershipObserver in value)) return () => {}
  const observe = value[membershipObserver]
  if (typeof observe !== 'function') throw new Error('invalid Team membership observer')
  return observe(listener) as () => void
}

export type MembershipIdentity = 'teammate' | 'subagent'
export type MembershipExchangeReason = 'busy' | 'transition-in-progress' | 'unfinished-tasks' | 'invalid-request' | 'unavailable' | 'not-found' | 'inconsistent-state' | 'rejected'

export interface MembershipExchangeRequest {
  readonly rootId: string
  readonly targetId: string
  readonly operationId: string
  readonly to: MembershipIdentity
  readonly name?: string
  readonly description?: string
}

export interface MembershipExchangeCandidate {
  readonly rootId: string
  readonly targetId: string
  readonly role: MembershipIdentity
  readonly name: string
  readonly label: string
  readonly status: 'running' | 'inactive' | 'unknown'
  readonly reason: MembershipExchangeReason | null
  readonly recovery: MembershipExchangeRequest | null
}

export interface MembershipExchangeResult {
  readonly rootId: string
  readonly targetId: string
  readonly operationId: string
  readonly to: MembershipIdentity
  readonly status: 'converted' | 'unchanged' | 'rejected' | 'recovery-required'
  readonly reason: MembershipExchangeReason | null
  readonly notification: 'delivered' | 'failed' | 'unchanged'
}

export interface MembershipUiPort {
  candidates(): Promise<MembershipExchangeCandidate[]>
  convert(request: MembershipExchangeRequest): Promise<MembershipExchangeResult>
}

/** Share only the private implementation bridge, never a named model-facing API. */
export function requireMembershipUiPort(value: unknown): MembershipUiPort {
  if (typeof value !== 'object' || value === null || !(membershipUiPort in value)) {
    throw new Error('membership exchange requires the active collaboration Team runtime')
  }
  const port = value[membershipUiPort]
  if (typeof port !== 'object' || port === null || !('candidates' in port) || !('convert' in port)
    || typeof port.candidates !== 'function' || typeof port.convert !== 'function') {
    throw new Error('membership exchange runtime bridge is unavailable')
  }
  return port as MembershipUiPort
}

/** Validate at the receiving boundary, not just in the browser codec. */
export function parseMembershipExchangeRequest(value: unknown): MembershipExchangeRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('invalid membership request')
  const fields = value as Record<string, unknown>
  const allowed = new Set(['rootId', 'targetId', 'operationId', 'to', 'name', 'description'])
  if (Object.keys(fields).some(key => !allowed.has(key))) throw new Error('unexpected membership request field')
  for (const key of ['rootId', 'targetId', 'operationId']) {
    if (typeof fields[key] !== 'string' || fields[key].trim() !== fields[key] || fields[key].length < 1 || fields[key].length > 128) {
      throw new Error('invalid membership request identity')
    }
  }
  if (fields.to !== 'teammate' && fields.to !== 'subagent') throw new Error('invalid membership direction')
  for (const [key, limit] of [['name', 128], ['description', 1024]] as const) {
    if (fields[key] !== undefined && (typeof fields[key] !== 'string' || fields[key].length > limit)) throw new Error('invalid membership text')
  }
  return fields as unknown as MembershipExchangeRequest
}

/** Keep server exceptions, paths, and credentials out of the browser result. */
export function membershipExchangeReason(error: unknown): MembershipExchangeReason {
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : ''
  if (/TRANSITION|CONVERSION_IN_PROGRESS/.test(code)) return 'transition-in-progress'
  if (/TASK.*(OWN|PENDING|UNFINISHED)|UNFINISHED_TASK|MEMBER_HAS_TASKS/.test(code)) return 'unfinished-tasks'
  if (/BUSY|ACTIVE_WORK|NOT_IDLE|PENDING_INPUT|HAS_CHILDREN|MEMBER_RUNNING/.test(code)) return 'busy'
  if (/NOT_FOUND/.test(code)) return 'not-found'
  if (/UNAVAILABLE|DISPOSED|CLOSING/.test(code)) return 'unavailable'
  if (/PROJECTION|PERSIST|CORRUPT|RECOVERY/.test(code)) return 'inconsistent-state'
  if (/INVALID/.test(code)) return 'invalid-request'
  return 'rejected'
}
