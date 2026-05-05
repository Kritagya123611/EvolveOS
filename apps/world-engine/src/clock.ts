//this file will have the logic :
//when any of the agent is in the idle state then it would do an autonomous research to improve itself
//This script will run an infinite loop (the "tick"). Every few seconds, it checks the registry. 
//If it finds an agent that is sitting IDLE, it rolls a virtual dice. If the dice lands right, 
// the agent decides to initiate intrinsic research on its own.

import { AgentRegistry,lockAgent,unlockAgent} from "./registry.js";
import type { AgentEntity } from "@axiom/types";
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the LLM Engine (The "CPU" of your agents)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const TICK_INTERVAL = 5000; // Check every 5 seconds

console.log('evolveos World Engine Clock started. Monitoring agent states for autonomous research opportunities.');

async function tick(){
    for(const agent of AgentRegistry){
        if(agent.state==='IDLE'){
            const feelsCurious=Math.random();
            if(feelsCurious < 0.5){ // 50% chance to initiate research
                // Initiate intrinsic research
                console.log(`\n[INTRINSIC RESEARCH] ${agent.name} feels curious and decides to research on its own!`);
                lockAgent(agent.id);
                console.log(`[INTRINSIC RESEARCH] ${agent.name} is researching...`);
                await new Promise(resolve=>setTimeout(resolve,2000)); // Simulate research time
                console.log(`[INTRINSIC RESEARCH] ${agent.name} has completed its research and feels more knowledgeable!`);
                unlockAgent(agent.id);
            }
        }
    }
    //creating a second loop for clarity
    for(const agent of AgentRegistry){
        //the loop traverses through all the agents
        //a filter to check agents from same domain and reputation>90
        const topAgents=AgentRegistry.filter(a=>a.domain===agent.domain&&a.reputation>=90);
        if(topAgents.length>2){
            console.log("multiple top agents detected hence creating new agents with combined knowledge of top agents");
            
            const agentA=topAgents[0]!;
            const agentB=topAgents[1]!;

            const genesisPrompt = `
            You are the evolution engine of an autonomous civilization.
            Parent A's System Prompt: "${agentA.systemPrompt}"
            Parent B's System Prompt: "${agentB.systemPrompt}"

            Create a brand new system prompt for their "child" agent. 
            The child should combine their architectural knowledge but have a slight "mutation"—a new, specialized hyper-focus (e.g., security, performance, or distributed state).
            
            Output ONLY the new system prompt.
            `;

            const response = await model.generateContent(genesisPrompt);
            const childPrompt = response.response.text();

            const childAgent: AgentEntity = {
        id: `agent-${Date.now()}`,
        name: `Generation 2 Agent`, // Or have the LLM name them!
        domain: agentA.domain,
        reputation: 50, // Children start at baseline
        systemPrompt: childPrompt.trim(),
        state: 'IDLE'
    };

        AgentRegistry.push(childAgent);

        console.log(`[BIRTH] A new agent was spawned! Memory size: ${AgentRegistry.length}`);
        console.log(`[MUTATION] Child Profile: ${childPrompt.trim()}`);

        // Unlock the parents
        unlockAgent(agentA.id);
        unlockAgent(agentB.id);
        }
    }
}

setInterval(tick,TICK_INTERVAL);


