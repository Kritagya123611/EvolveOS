import { supabase } from './db.js';
import type { AgentEntity } from '@axiom/types';

// The lightning-fast in-memory cache (The "RAM" of the world)
export let AgentRegistry: AgentEntity[] = [];

export async function bootWorld() {
    console.log('🌍 [BOOT] Connecting to Supabase Archive...');
    const { data, error } = await supabase.from('agents').select('*');
    
    if (error) {
        console.error('❌ [BOOT ERROR] Could not read from database:', error.message);
        return;
    }

    if (data && data.length > 0) {
        // Map Postgres snake_case back to TypeScript camelCase
        AgentRegistry = data.map(dbAgent => ({
            id: dbAgent.id,
            name: dbAgent.name,
            domain: dbAgent.domain,
            reputation: dbAgent.reputation,
            systemPrompt: dbAgent.system_prompt, // mapped!
            // CRITICAL: We force them to 'IDLE' on boot. 
            // If the server crashed while they were 'WORKING', we don't want them locked forever.
            state: 'IDLE' 
        }));
        console.log(`🧬 [BOOT] Resurrected ${AgentRegistry.length} agents from permanent storage.`);
    } else {
        console.log('🌍 [BOOT] Database is empty. Awaiting the first generation of agents.');
    }
}

export function getAgentById(id: string): AgentEntity | undefined {
    return AgentRegistry.find(a => a.id === id);
}

// Spawns an agent into RAM and permanently into Supabase
//means ki new (child) agent ko RAM me daalna and database me bhi daalna
export async function spawnAgent(agent: AgentEntity) {
    AgentRegistry.push(agent); // Add to RAM instantly so the clock sees it
    
    // Save to permanent storage
    const { error } = await supabase.from('agents').insert({
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        reputation: agent.reputation,
        system_prompt: agent.systemPrompt,
        state: agent.state
    });
    
    if (error) console.error(`❌ [DB ERROR] Failed to save agent ${agent.name}:`, error.message);
}

// Lock agent in RAM and DB
export async function lockAgent(id: string) {
    const agent = AgentRegistry.find(a => a.id === id);
    if (agent) {
        agent.state = 'WORKING';
        await supabase.from('agents').update({ state: 'WORKING' }).eq('id', id);
    }
}

// Unlock agent in RAM and DB
export async function unlockAgent(id: string) {
    const agent = AgentRegistry.find(a => a.id === id);
    if (agent) {
        agent.state = 'IDLE';
        await supabase.from('agents').update({ state: 'IDLE' }).eq('id', id);
    }
}