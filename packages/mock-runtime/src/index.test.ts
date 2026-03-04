import { describe, expect, it } from 'vitest';
import { MockRunwayCtrlRuntime } from './index.js';

describe('MockRunwayCtrlRuntime', () => {
  it('replays outcomes for the same action key', () => {
    const rt = new MockRunwayCtrlRuntime({ idFactory: () => 'att_1' });

    const first = rt.beginAction({ actionKey: 'act_1' });
    expect(first).toEqual({ decision: 'PROCEED', actionKey: 'act_1', attemptId: 'att_1' });

    const pending = rt.beginAction({ actionKey: 'act_1' });
    expect(pending).toEqual({ decision: 'PENDING', actionKey: 'act_1', attemptId: 'att_1' });

    rt.completeAttempt({ attemptId: 'att_1', outcome: { ok: true, value: { id: 123 } } });

    const replay = rt.beginAction({ actionKey: 'act_1' });
    expect(replay).toEqual({ decision: 'REPLAY_SUCCESS', actionKey: 'act_1', attemptId: 'att_1' });

    const status = rt.getAction<{ id: number }>('act_1');
    expect(status.decision).toBe('REPLAY_SUCCESS');
    expect(status.outcome).toEqual({ ok: true, value: { id: 123 } });
  });
});
