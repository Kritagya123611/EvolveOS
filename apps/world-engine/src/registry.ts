import { supabase } from './db.js';
import type { AgentEntity } from '@axiom/types';

//the ram of the world
export let AgentRegistry: AgentEntity[] = [];

export async function bootWorld() {
    console.log('Connecting to Supabase Archive...');
    const { data, error } = await supabase.from('agents').select('*');
    
    if (error) {
        console.error('Could not read from database:', error.message);
        return;
    }

    if (data && data.length > 0) {
        AgentRegistry = data.map(dbAgent => ({
            id: dbAgent.id,
            name: dbAgent.name,
            domain: dbAgent.domain,
            reputation: dbAgent.reputation,
            systemPrompt: dbAgent.system_prompt, 
            state: 'IDLE' 
        }));
        console.log(`Resurrected ${AgentRegistry.length} agents from permanent storage.`);
    } else {
        console.log('Database is empty. Awaiting the first generation of agents.');
    }
}

export function getAgentById(id: string): AgentEntity | undefined {
    return AgentRegistry.find(a => a.id === id);
}

export async function spawnAgent(agent: AgentEntity) {
    AgentRegistry.push(agent); 
    const { error } = await supabase.from('agents').insert({
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        reputation: agent.reputation,
        system_prompt: agent.systemPrompt,
        state: agent.state
    });
    
    if (error) console.error(`Failed to save agent ${agent.name}:`, error.message);
}

export async function lockAgent(id: string) {
    const agent = AgentRegistry.find(a => a.id === id);
    if (agent) {
        agent.state = 'WORKING';
        await supabase.from('agents').update({ state: 'WORKING' }).eq('id', id);
    }
}

export async function unlockAgent(id: string) {
    const agent = AgentRegistry.find(a => a.id === id);
    if (agent) {
        agent.state = 'IDLE';
        await supabase.from('agents').update({ state: 'IDLE' }).eq('id', id);
    }
}