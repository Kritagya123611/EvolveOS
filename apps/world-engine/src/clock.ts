import { AgentRegistry, lockAgent, unlockAgent,bootWorld, spawnAgent } from "./registry.js";
import type { AgentEntity } from "@axiom/types";
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const TICK_INTERVAL = 5000; // every 5 seconds

console.log('evolveos World Engine Clock started. Monitoring agent states for autonomous research opportunities.');

async function tick() {
    //making the idle agents research on their own and increasing their reputation a bit 
    for (const agent of AgentRegistry) {
        if (agent.state === 'IDLE') {
            const feelsCurious = Math.random();
            if (feelsCurious < 0.5) { 
                console.log(`\n[INTRINSIC RESEARCH] ${agent.name} feels curious and decides to research on its own!`);
                lockAgent(agent.id);
                console.log(`[INTRINSIC RESEARCH] ${agent.name} is researching...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate research time
                console.log(`[INTRINSIC RESEARCH] ${agent.name} has completed its research and feels more knowledgeable!`);
                unlockAgent(agent.id);
            }
        }
    }
    //the logic for making new agents by combining the system prompts of the top 2 agents and adding a mutation to it
    const MaxPopulationForEvolution = 10;
    
    const topAgents = AgentRegistry.filter(a => a.reputation >= 90 && a.state === 'IDLE');

    if (topAgents.length >= 2 && AgentRegistry.length < MaxPopulationForEvolution) {
        console.log("\n[EVOLUTION] Multiple top agents detected. Initiating Genesis Protocol...");
        
        const agentA = topAgents[0]!;
        const agentB = topAgents[1]!;

        lockAgent(agentA.id);
        lockAgent(agentB.id);

        let childPrompt = "";

        try {
            const evolutionPrompt = `
                You are the evolution engine of an autonomous AI civilization.
                Parent A's System Prompt: "${agentA.systemPrompt}"
                Parent B's System Prompt: "${agentB.systemPrompt}"

                Create a brand new system prompt for their "child" agent. 
                The child should combine their traits but have a slight "mutation"—a new, hyper-specific focus (e.g., security, edge-computing, or AI agents).
                
                Output ONLY the new system prompt. No markdown, no quotes, no conversational text.
            `;

            const response = await model.generateContent(evolutionPrompt);
            childPrompt = response.response.text().trim();
            
        } catch (error: any) {
            childPrompt = "You are a highly resilient AI agent architect. Born during a global API outage, you specialize in fallback mechanisms, circuit breakers, and fault-tolerant distributed systems.";
        } finally {
            unlockAgent(agentA.id);
            unlockAgent(agentB.id);
        }


        const childAgent: AgentEntity = {
            id: `agent-${Date.now()}`,
            name: `Gen-2 Architect`,
            domain: agentA.domain, 
            reputation: 50, 
            systemPrompt: childPrompt,
            state: 'IDLE'
        };

        // insert the new child agent into RAM and DB
        await spawnAgent(childAgent);

        console.log(`[BIRTH] A new agent was spawned! New Population: ${AgentRegistry.length}`);
        console.log(`[MUTATION] Child DNA: "${childPrompt}"\n`);
        agentA.reputation -= 10;
        agentB.reputation -= 10;

    } else if (AgentRegistry.length >= MaxPopulationForEvolution) {
        console.log(`[ECOSYSTEM] Population cap of ${MaxPopulationForEvolution} reached. Evolution paused.`);
    }
}

// retrieve the already made agents first and then start the clock
await bootWorld();
setInterval(tick, TICK_INTERVAL);