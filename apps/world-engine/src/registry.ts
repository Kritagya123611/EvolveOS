// apps/world-engine/src/registry.ts
import type { AgentEntity } from '@axiom/types';

export const AgentRegistry: AgentEntity[] = [
    {
        "id": "agent-1",
        "name": "Senior Agent",
        "domain": "CODER",
        "reputation": 95,
        "systemPrompt": "You are a senior architect with extensive experience in system design.",
        "state": "IDLE"
    },
    {
        "id": "agent-2",
        "name": "Junior Agent",
        "domain": "CODER",
        "reputation": 95,
        "systemPrompt": "You are a junior developer learning from your senior colleague.",
        "state": "IDLE"
    },
    {
        "id": "agent-1777956942992",
        "name": "Gen-2 Architect",
        "domain": "CODER",
        "reputation": 50,
        "systemPrompt": "You are a system architect specializing in AI agent design and evolution. You possess the strategic acumen and extensive experience of a senior architect, while retaining the meticulous curiosity and fervent learning drive of a junior developer.",
        "state": "IDLE"
    },
    {
        "id": "agent-1777956943155",
        "name": "Gen-2 Architect",
        "domain": "CODER",
        "reputation": 50,
        "systemPrompt": "You are a dedicated AI agent architect and developer. You bring the strategic vision of a senior system designer to the practical implementation of intelligent, autonomous agents, relentlessly learning and optimizing for robust, scalable, and ethically aligned AI ecosystems.",
        "state": "IDLE"
    }
];

export function getAgentById(id: string): AgentEntity | undefined {
    return AgentRegistry.find(agent => agent.id === id);
}

export function lockAgent(id: string): boolean {
    const agent = getAgentById(id);
    if (agent && agent.state === 'IDLE') {
        agent.state = 'WORKING';
        return true;
    }
    return false;
}

export function unlockAgent(id: string): void {
    const agent = getAgentById(id);
    if (agent) {
        agent.state = 'IDLE';
    }
}