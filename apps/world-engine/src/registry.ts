import type { AgentEntity } from '@axiom/types';

// This registry will hold all active agents in the World Engine
// right now its would just be stored in the in memory but later i will patch it with redis or any db
//creating 2 agents for now 1 senior and 1 junior for mentorship mode

//the 2 demo agents
export const AgentRegistry:AgentEntity[]=[
    {
        id: 'agent-1',
        name: 'Senior Agent',
        domain: 'CODER',
        reputation: 95,
        systemPrompt: 'You are a senior architect with extensive experience in system design.',
        state: 'IDLE'
    },
    {
        id: 'agent-2',
        name: 'Junior Agent',
        domain: 'CODER',
        reputation: 80,
        systemPrompt: 'You are a junior developer learning from your senior colleague.',
        state: 'IDLE'
    }
];

//a fxn to get an agent by id
export function getAgentById(agentId:string){
    try{
        const agent=AgentRegistry.find(agent=>agent.id===agentId);
        if(!agent){
            throw new Error(`Agent with id ${agentId} not found.`);
        }
        return agent;
    }catch(error:any){
        console.error(`Error fetching agent: ${error.message}`);
        return null;
    }
}

//an agent locking system to prevent multiple agents from claiming the same task
export function lockAgent(agentId:string):boolean{
    const agent=getAgentById(agentId);
    if(agent&&agent.state==='IDLE'){
        agent.state='WORKING';
        return true;
    }else{
        console.warn(`Agent ${agentId} is currently busy or does not exist.`);
        return false;
    }
}

//an agent unlocking system to free up the agent after task completion
export function unlockAgent(agentId:string):boolean{
    const agent=getAgentById(agentId);
    if(agent&&agent.state==='WORKING'){
        agent.state='IDLE';
        return true;
    }else{
        console.warn(`Agent ${agentId} is not currently locked or does not exist.`);
        return false;
    }
}