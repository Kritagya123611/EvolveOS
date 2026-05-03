//This is the algorithm that decides how a task gets executed. It looks at the available 
// agents and decides whether to send an expert alone, or whether to trigger the Mentorship 
// Protocol so a junior can learn.

import crypto from 'crypto'; // Native Node module for generating IDs
import type { TaskPacket, JobRecord, AgentDomain } from '@axiom/types';
import { agentRegistry, lockAgent } from './registry';

// The threshold rules for the civilization's economy
const SENIOR_THRESHOLD = 80.0;
const JUNIOR_THRESHOLD = 40.0;

export function assignTaskToAgents(task: TaskPacket, requiredDomain: AgentDomain) : JobRecord | null {
    console.log(`\n[DISPATCHER] Evaluating task ${task.id} for agent assignment...`);

    // Filter agents by required domain and sort by reputation
    const availableAgents = agentRegistry.filter(a => a.state === 'IDLE' && a.domain === requiredDomain);

    if (availableAgents.length === 0) {
        console.log(`[DISPATCHER] No available agents for ${requiredDomain}. Task will wait.`);
        return null;
    }

    // Sort them by reputation (Highest first)
    availableAgents.sort((a, b) => b.reputation - a.reputation);
    
}