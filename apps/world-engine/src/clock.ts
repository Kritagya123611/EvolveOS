//this file will have the logic :
//when any of the agent is in the idle state then it would do an autonomous research to improve itself
//This script will run an infinite loop (the "tick"). Every few seconds, it checks the registry. 
//If it finds an agent that is sitting IDLE, it rolls a virtual dice. If the dice lands right, 
// the agent decides to initiate intrinsic research on its own.

import { AgentRegistry,lockAgent,unlockAgent} from "./registry.js";
import type { AgentEntity } from "@axiom/types";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { error } from "console";
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
        if(topAgents.length>=2){
            console.log("multiple top agents detected hence creating new agents with combined knowledge of top agents");
            
            const agentA=topAgents[0]!;
            const agentB=topAgents[1]!;

            lockAgent(agentA.id);
            lockAgent(agentB.id);

            try{
                const evolutionPrompt = `
                You are the evolution engine of an autonomous AI civilization.
                Parent A's System Prompt: "${agentA.systemPrompt}"
                Parent B's System Prompt: "${agentB.systemPrompt}"

                Create a brand new system prompt for their "child" agent. 
                The child should combine their traits but have a slight "mutation"—a new, hyper-specific focus (e.g., security, edge-computing, or AI agents).
                
                Output ONLY the new system prompt. No markdown, no quotes, no conversational text.
            `;

            const response = await model.generateContent(evolutionPrompt);
            const childPrompt = response.response.text().trim();

            const childAgent: AgentEntity = {
                id: `agent-${Date.now()}`,
                name: `Gen-2 Architect`,
                domain: agentA.domain,
                reputation: 50, // Starts at the bottom of the hierarchy
                systemPrompt: childPrompt,
                state: 'IDLE'
            };

            AgentRegistry.push(childAgent);

            console.log(`🎉 [BIRTH] A new agent was spawned! New Population: ${AgentRegistry.length}`);
            console.log(`🧬 [MUTATION] Child DNA: "${childPrompt}"`);
            }catch(error:any){
                console.error(`Error during agent evolution: ${error.message}`);
            }finally{
                unlockAgent(agentA.id);
                unlockAgent(agentB.id);
            }
        }else{
            console.log(`No significant population of top agents in ${agent.domain} domain. Current top agents: ${topAgents.length}`);
        }
    }
}

setInterval(tick,TICK_INTERVAL);


