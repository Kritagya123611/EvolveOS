import { AgentRegistry, lockAgent, unlockAgent, bootWorld, spawnAgent } from './registry.js';
import type { AgentEntity } from '@axiom/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini for autonomous research and evolution
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// How often the clock ticks (in milliseconds)
const TICK_INTERVAL = 5000;

// Maximum number of agents in the civilization
const MAX_POPULATION = 10;

console.log('EvolveOS World Engine Clock started. Monitoring agent states for autonomous research opportunities.');

/**
 * The heartbeat function — runs every TICK_INTERVAL milliseconds.
 * Two main responsibilities:
 *   1. Intrinsic Research — idle agents randomly decide to research on their own
 *   2. Genesis Protocol — when top agents are found, breed a new agent
 */
async function tick() {
  // --- Intrinsic Research ---
  // Idle agents have a 50% chance each tick to do some self-directed research
  for (const agent of AgentRegistry) {
    if (agent.state === 'IDLE') {
      const feelsCurious = Math.random();
      if (feelsCurious < 0.5) {
        console.log(`\n[INTRINSIC RESEARCH] ${agent.name} feels curious and decides to research on its own!`);

        await lockAgent(agent.id);
        console.log(`[INTRINSIC RESEARCH] ${agent.name} is researching...`);

        // Simulate research time
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log(`[INTRINSIC RESEARCH] ${agent.name} has completed its research and feels more knowledgeable!`);
        await unlockAgent(agent.id);
      }
    }
  }

  // --- Genesis Protocol ---
  // If two or more agents have reputation >= 90 and the population is under the cap,
  // breed a new "child" agent by combining their system prompts
  const topAgents = AgentRegistry.filter((a) => a.reputation >= 90 && a.state === 'IDLE');

  if (topAgents.length >= 2 && AgentRegistry.length < MAX_POPULATION) {
    console.log('\n[EVOLUTION] Multiple top agents detected. Initiating Genesis Protocol...');

    const agentA = topAgents[0]!;
    const agentB = topAgents[1]!;

    // Lock both parents during the evolution process
    await lockAgent(agentA.id);
    await lockAgent(agentB.id);

    let childPrompt = '';

    try {
      // Ask the LLM to create a new system prompt by combining both parents
      const evolutionPrompt = `
        You are the evolution engine of an autonomous AI civilization.
        Parent A's System Prompt: "${agentA.systemPrompt}"
        Parent B's System Prompt: "${agentB.systemPrompt}"

        Create a brand new system prompt for their "child" agent.
        The child should combine their traits but have a slight "mutation" — a new, hyper-specific focus (e.g., security, edge-computing, or AI agents).

        Output ONLY the new system prompt. No markdown, no quotes, no conversational text.
      `;

      const response = await model.generateContent(evolutionPrompt);
      childPrompt = response.response.text().trim();
    } catch (error: unknown) {
      // Fallback prompt if the LLM is down
      childPrompt =
        'You are a highly resilient AI agent architect. Born during a global API outage, you specialize in fallback mechanisms, circuit breakers, and fault-tolerant distributed systems.';
    } finally {
      // Always unlock the parents, even if evolution fails
      await unlockAgent(agentA.id);
      await unlockAgent(agentB.id);
    }

    // Create the child agent entity
    const childAgent: AgentEntity = {
      id: `agent-${Date.now()}`,
      name: `Gen-2 Architect`,
      domain: agentA.domain,
      reputation: 50, // New agents start with average reputation
      systemPrompt: childPrompt,
      state: 'IDLE',
    };

    // Persist the child to RAM + Supabase
    await spawnAgent(childAgent);

    console.log(`[BIRTH] A new agent was spawned! New Population: ${AgentRegistry.length}`);
    console.log(`[MUTATION] Child DNA: "${childPrompt}"\n`);

    // Parents lose some reputation after breeding (they shared their knowledge)
    agentA.reputation -= 10;
    agentB.reputation -= 10;
  } else if (AgentRegistry.length >= MAX_POPULATION) {
    console.log(`[ECOSYSTEM] Population cap of ${MAX_POPULATION} reached. Evolution paused.`);
  }
}

// Load all existing agents first, then start the heartbeat clock
await bootWorld();
setInterval(tick, TICK_INTERVAL);
