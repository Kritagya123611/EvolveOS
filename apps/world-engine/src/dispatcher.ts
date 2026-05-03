//This is the algorithm that decides how a task gets executed. It looks at the available 
// agents and decides whether to send an expert alone, or whether to trigger the Mentorship 
// Protocol so a junior can learn.

import crypto from 'crypto';
import type { TaskPacket, JobRecord, AgentDomain, AgentEntity } from '@axiom/types';
import { AgentRegistry, lockAgent } from './registry.js';

const SENIOR_THRESHOLD = 80.0;
const JUNIOR_THRESHOLD = 40.0;

export function assignTaskToAgents(
  task: TaskPacket,
  requiredDomain: AgentDomain
): JobRecord | null {
  console.log(`\n[DISPATCHER] Evaluating task ${task.id} for agent assignment...`);

  // Step 1: Filter available agents
  const availableAgents: AgentEntity[] = AgentRegistry
    .filter(a => a.state === 'IDLE' && a.domain === requiredDomain);

  if (availableAgents.length === 0) {
    console.log(`[DISPATCHER] No available agents for ${requiredDomain}. Task will wait.`);
    return null;
  }

  // Step 2: Sort by reputation (highest first)
  availableAgents.sort((a, b) => b.reputation - a.reputation);

  // Step 3: Safely extract agents
  const highestRepAgent = availableAgents[0];
  const lowestRepAgent = availableAgents.at(-1);

  // Type safety guard (fixes TS error)
  if (!highestRepAgent || !lowestRepAgent) {
    console.error('[DISPATCHER] Unexpected state: agents not found after filtering.');
    return null;
  }

  // Step 4: Mentorship decision
  const shouldMentor =
    highestRepAgent.reputation >= SENIOR_THRESHOLD &&
    lowestRepAgent.reputation <= JUNIOR_THRESHOLD &&
    highestRepAgent.id !== lowestRepAgent.id;

  if (shouldMentor) {
    console.log(`[DISPATCHER] Decision: MENTORSHIP Protocol Activated.`);
    console.log(
      `[DISPATCHER] Lead: ${highestRepAgent.name} | Shadow: ${lowestRepAgent.name}`
    );

    // Lock both agents
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

  // Step 5: SOLO execution
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
//the next task in this file would be to implement a function that listens for new tasks in the queue coming
//in and then calls the assignTaskToAgents function to assign the task to the appropriate agents based on the algorithm.
//just guide me copilot
//you can use the BullMQ Worker to listen for new tasks on the queue. When a new task is added, the worker will process it and call the assignTaskToAgents function to determine how to assign it to agents. Here's a basic outline of how you can implement this: