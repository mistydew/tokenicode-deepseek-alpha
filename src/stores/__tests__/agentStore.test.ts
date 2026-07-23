import { afterEach, describe, expect, it } from 'vitest';
import { useAgentStore, type AgentNode } from '../agentStore';

function mainAgent(phase: AgentNode['phase']): AgentNode {
  return {
    id: 'main',
    parentId: null,
    description: 'test',
    phase,
    startTime: 1,
    isMain: true,
  };
}

afterEach(() => {
  useAgentStore.setState({ agents: new Map(), agentCache: new Map() });
});

describe('agentStore updatePhase', () => {
  it('does not publish a store update when the phase is unchanged', () => {
    const agents = new Map([['main', mainAgent('thinking')]]);
    useAgentStore.setState({ agents });
    let notifications = 0;
    const unsubscribe = useAgentStore.subscribe(() => {
      notifications += 1;
    });

    useAgentStore.getState().updatePhase('main', 'thinking');

    unsubscribe();
    expect(useAgentStore.getState().agents).toBe(agents);
    expect(notifications).toBe(0);
  });

  it('publishes one update when the phase changes', () => {
    useAgentStore.setState({ agents: new Map([['main', mainAgent('thinking')]]) });
    let notifications = 0;
    const unsubscribe = useAgentStore.subscribe(() => {
      notifications += 1;
    });

    useAgentStore.getState().updatePhase('main', 'writing');

    unsubscribe();
    expect(useAgentStore.getState().agents.get('main')?.phase).toBe('writing');
    expect(notifications).toBe(1);
  });
});
