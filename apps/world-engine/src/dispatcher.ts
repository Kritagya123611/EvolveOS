import crypto from 'crypto';
import type { TaskPacket, JobRecord, AgentDomain, AgentEntity } from '@axiom/types';
import { AgentRegistry, lockAgent } from './registry.js';

const SENIOR_THRESHOLD = 80.0;
const JUNIOR_THRESHOLD = 40.0;

export function assignTaskToAgents(task: TaskPacket,requiredDomain: AgentDomain): JobRecord | null {
  console.log(`\n[DISPATCHER] Evaluating task ${task.id} for agent assignment...`);

  const availableAgents: AgentEntity[] = AgentRegistry
    .filter(a => a.state === 'IDLE' && a.domain === requiredDomain);

  if (availableAgents.length === 0) {
    console.log(`[DISPATCHER] No available agents for ${requiredDomain}. Task will wait.`);
    return null;
  }

  availableAgents.sort((a, b) => b.reputation - a.reputation);

  const highestRepAgent = availableAgents[0];
  const lowestRepAgent = availableAgents[availableAgents.length - 1];

  if (!highestRepAgent || !lowestRepAgent) {
    console.error('[DISPATCHER] Unexpected state: agents not found after filtering.');
    return null;
  }

  const shouldMentor =
    highestRepAgent.reputation >= SENIOR_THRESHOLD &&
    lowestRepAgent.reputation <= JUNIOR_THRESHOLD &&
    highestRepAgent.id !== lowestRepAgent.id;

  if (shouldMentor) {
    console.log(`[DISPATCHER] Decision: MENTORSHIP Protocol Activated.`);
    console.log(
      `[DISPATCHER] Lead: ${highestRepAgent.name} | Shadow: ${lowestRepAgent.name}`
    );

    lockAgent(highestRepAgent.id);
    lockAgent(lowestRepAgent.id);

    return {
      id: crypto.randomUUID(),
      taskId: task.id,
      mode: 'MENTORSHIP',
      leadAgentId: highestRepAgent.id,
      shadowAgentId: lowestRepAgent.id,
      status: 'DISPATCHED',
      startedAt: Date.now()
    };
  }

  console.log(`[DISPATCHER] Decision: SOLO Execution.`);
  console.log(`[DISPATCHER] Assigned Agent: ${highestRepAgent.name}`);

  lockAgent(highestRepAgent.id);

  return {
    id: crypto.randomUUID(),
    taskId: task.id,
    mode: 'SOLO',
    leadAgentId: highestRepAgent.id,
    status: 'DISPATCHED',
    startedAt: Date.now()
  };
}