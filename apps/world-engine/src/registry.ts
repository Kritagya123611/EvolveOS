import { supabase } from './db.js';
import type { AgentEntity } from '@axiom/types';

// The in-memory registry — a RAM mirror of the agents table in Supabase
// This gives us microsecond reads without hitting the database on every lookup
export let AgentRegistry: AgentEntity[] = [];

/**
 * Boot the world by loading all agents from Supabase into RAM.
 * Also resets all agent states to IDLE — this is crash recovery.
 * If the process crashed while an agent was WORKING, it gets unstuck.
 */
export async function bootWorld() {
  console.log('[BOOT] Connecting to Supabase Archive...');
  const { data, error } = await supabase.from('agents').select('*');

  if (error) {
    console.error('[BOOT] Could not read from database:', error.message);
    return;
  }

  if (data && data.length > 0) {
    AgentRegistry = data.map((dbAgent) => ({
      id: dbAgent.id,
      name: dbAgent.name,
      domain: dbAgent.domain,
      reputation: dbAgent.reputation,
      systemPrompt: dbAgent.system_prompt,
      state: 'IDLE', // Always start idle — crash recovery
    }));
    console.log(`[BOOT] Resurrected ${AgentRegistry.length} agents from permanent storage.`);
  } else {
    console.log('[BOOT] Database is empty. Awaiting the first generation of agents.');
  }
}

/** Find an agent by its ID in the in-memory registry */
export function getAgentById(id: string): AgentEntity | undefined {
  return AgentRegistry.find((a) => a.id === id);
}

/**
 * Spawn a new agent — add to RAM and persist to Supabase.
 * This is called during the Genesis Protocol when breeding new agents.
 */
export async function spawnAgent(agent: AgentEntity) {
  AgentRegistry.push(agent);
  const { error } = await supabase.from('agents').insert({
    id: agent.id,
    name: agent.name,
    domain: agent.domain,
    reputation: agent.reputation,
    system_prompt: agent.systemPrompt,
    state: agent.state,
  });

  if (error) {
    console.error(`[SPAWN] Failed to save agent ${agent.name}:`, error.message);
  }
}

/**
 * Lock an agent — mark it as WORKING in both RAM and Supabase.
 * A locked agent cannot be assigned new tasks.
 */
export async function lockAgent(id: string): Promise<void> {
  const agent = AgentRegistry.find((a) => a.id === id);
  if (agent) {
    agent.state = 'WORKING';
    const { error } = await supabase.from('agents').update({ state: 'WORKING' }).eq('id', id);
    if (error) {
      console.error(`[LOCK] Failed to lock agent ${id} in database:`, error.message);
    }
  }
}

/**
 * Unlock an agent — mark it as IDLE in both RAM and Supabase.
 * The agent is now available for new tasks.
 */
export async function unlockAgent(id: string): Promise<void> {
  const agent = AgentRegistry.find((a) => a.id === id);
  if (agent) {
    agent.state = 'IDLE';
    const { error } = await supabase.from('agents').update({ state: 'IDLE' }).eq('id', id);
    if (error) {
      console.error(`[UNLOCK] Failed to unlock agent ${id} in database:`, error.message);
    }
  }
}
