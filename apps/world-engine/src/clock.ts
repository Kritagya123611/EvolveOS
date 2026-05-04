//this file will have the logic :
//when any of the agent is in the idle state then it would do an autonomous research to improve itself
//This script will run an infinite loop (the "tick"). Every few seconds, it checks the registry. 
//If it finds an agent that is sitting IDLE, it rolls a virtual dice. If the dice lands right, 
// the agent decides to initiate intrinsic research on its own.

import { AgentRegistry,lockAgent,unlockAgent} from "./registry.js";

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
}

setInterval(tick,TICK_INTERVAL);

