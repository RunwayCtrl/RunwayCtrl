export type ActionKey = string;
export type AttemptId = string;

export type Decision = 'PROCEED' | 'PENDING' | 'REPLAY_SUCCESS' | 'REPLAY_FAILURE';

export interface BeginActionInput<TArgs = unknown> {
  /** Stable, semantic idempotency key produced by the SDK/user. */
  actionKey: ActionKey;
  /** Optional hot-resource identifier used for bounded concurrency in the real system. */
  resourceKey?: string;
  /** Opaque tool/action args (kept in-memory only). */
  args?: TArgs;
}

export type AttemptOutcome<TValue = unknown> =
  | { ok: true; value: TValue }
  | { ok: false; error: unknown };

export interface BeginActionResult {
  decision: Decision;
  actionKey: ActionKey;
  attemptId?: AttemptId;
}

export interface CompleteAttemptInput<TValue = unknown> {
  attemptId: AttemptId;
  outcome: AttemptOutcome<TValue>;
}

export interface GetActionResult<TValue = unknown> {
  actionKey: ActionKey;
  decision: Decision;
  attemptId?: AttemptId;
  outcome?: AttemptOutcome<TValue>;
}

interface ActionRecord<TValue = unknown> {
  actionKey: ActionKey;
  attemptId: AttemptId;
  outcome?: AttemptOutcome<TValue>;
}

export interface MockRuntimeOptions {
  /** Optional deterministic id generator for tests. */
  idFactory?: () => string;
}

/**
 * In-memory mock of the RunwayCtrl control-plane behavior for SDK development.
 *
 * - No HTTP
 * - No auth
 * - No persistence
 *
 * It is intentionally minimal: it models idempotency + replay outcomes so SDK
 * ergonomics can be developed without shipping the proprietary control plane.
 */
export class MockRunwayCtrlRuntime {
  private readonly actions = new Map<ActionKey, ActionRecord>();
  private readonly attempts = new Map<AttemptId, { actionKey: ActionKey }>();
  private readonly idFactory: () => string;

  public constructor(options: MockRuntimeOptions = {}) {
    this.idFactory = options.idFactory ?? (() => `att_${Math.random().toString(16).slice(2)}`);
  }

  public beginAction(input: BeginActionInput): BeginActionResult {
    const existing = this.actions.get(input.actionKey);
    if (!existing) {
      const attemptId = this.idFactory() as AttemptId;
      this.actions.set(input.actionKey, { actionKey: input.actionKey, attemptId });
      this.attempts.set(attemptId, { actionKey: input.actionKey });
      return { decision: 'PROCEED', actionKey: input.actionKey, attemptId };
    }

    if (existing.outcome) {
      return {
        decision: existing.outcome.ok ? 'REPLAY_SUCCESS' : 'REPLAY_FAILURE',
        actionKey: input.actionKey,
        attemptId: existing.attemptId,
      };
    }

    // An attempt exists but has not been completed yet.
    return { decision: 'PENDING', actionKey: input.actionKey, attemptId: existing.attemptId };
  }

  public completeAttempt<TValue = unknown>(input: CompleteAttemptInput<TValue>): void {
    const attempt = this.attempts.get(input.attemptId);
    if (!attempt) {
      throw new Error(`Unknown attempt_id: ${input.attemptId}`);
    }

    const action = this.actions.get(attempt.actionKey);
    if (!action) {
      throw new Error(`Invariant violated: action missing for attempt_id ${input.attemptId}`);
    }

    // Only first completion “wins” (mimics effectively-once semantics).
    if (!action.outcome) {
      action.outcome = input.outcome as AttemptOutcome;
      this.actions.set(action.actionKey, action);
    }
  }

  public getAction<TValue = unknown>(actionKey: ActionKey): GetActionResult<TValue> {
    const action = this.actions.get(actionKey);
    if (!action) {
      return { decision: 'PENDING', actionKey };
    }

    if (!action.outcome) {
      return { decision: 'PENDING', actionKey, attemptId: action.attemptId };
    }

    return {
      decision: action.outcome.ok ? 'REPLAY_SUCCESS' : 'REPLAY_FAILURE',
      actionKey,
      attemptId: action.attemptId,
      outcome: action.outcome as AttemptOutcome<TValue>,
    };
  }

  public reset(): void {
    this.actions.clear();
    this.attempts.clear();
  }
}

export const createMockRuntime = (options?: MockRuntimeOptions): MockRunwayCtrlRuntime =>
  new MockRunwayCtrlRuntime(options);
