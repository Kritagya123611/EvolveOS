import crypto from 'crypto';
import type { TaskPacket, JobRecord, AgentDomain, AgentEntity } from '@axiom/types';
import { AgentRegistry, lockAgent } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
// We use Gemini Flash here because bidding needs to be extremely fast
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" } // Force strict JSON output
});
//we just want the score here and no text

const SENIOR_THRESHOLD = 80.0;
const JUNIOR_THRESHOLD = 40.0;

//right now the logic of the dispatcher is :
//1. filter agents based on the required domain and availability
//2. sort them by reputation
//3. if the highest rep agent is above the senior threshold and the lowest rep agent is 
//below the junior threshold, assign both in mentorship mode
//4. otherwise, assign the highest rep agent in solo mode

//my next goal for it:
//Instead of telling an agent to do a job, the system will broadcast the job to the entire
//civilization, and the agents will use their LLM brains to read the task, look at their
//own skills, and bid a confidence score from 0 to 100. The highest bidder wins the job

//the fxn responsible for assigning the task to the agents based on their reputation and 
//domain and also deciding the mentorship protocol if the conditions are met
export async function assignTaskToAgents(task: TaskPacket,requiredDomain: AgentDomain): Promise<{ leadAgentId: string, shadowAgentId?: string } | null> {
  console.log(`\n[DISPATCHER] Evaluating task ${task.id} for agent assignment...`);

  //get all the agents which are from the same domain and are idle 
  const availableAgents: AgentEntity[] = AgentRegistry
    .filter(a => a.state === 'IDLE' && a.domain === requiredDomain);

  if (availableAgents.length === 0) {
    console.log(`[DISPATCHER] No available agents for ${requiredDomain}. Task will wait.`);
    return null;
  }

  //have all available agents bid on the task
  const bidPromises = availableAgents.map(async (agent) => {
        const bid = await evaluateAgentBid(task.intent, agent);
        return { agent, ...bid };
    });

  const auctionResults = await Promise.all(bidPromises);

    // 3. Sort the results from highest score to lowest
    auctionResults.sort((a, b) => b.score - a.score);

    if (auctionResults.length === 0) {
      console.log('[DISPATCHER] Auction completed with no bids.');
      return null;
    }

    const winner = auctionResults[0]!;
    
    // Lock the winning Lead Agent
    lockAgent(winner.agent.id);
    console.log(`[AUCTION CLOSED] Winner: ${winner.agent.name} (${winner.score}/100).`);

    // 4. Mentorship Logic: The lowest bidder gets assigned to watch and learn
    let shadowAgentId: string | undefined = undefined;
    
    if (auctionResults.length > 1) {
        const loser = auctionResults[auctionResults.length - 1]!; // The very last item
        lockAgent(loser.agent.id);
        shadowAgentId = loser.agent.id;
        console.log(`[DISPATCHER] Shadow assigned: ${loser.agent.name} (Score: ${loser.score}) needs to learn this domain.`);
    }

    return {
        leadAgentId: winner.agent.id,
        ...(shadowAgentId ? { shadowAgentId } : {})
    };
}

//a fxn that would evaluate the task with its system prompt and return a confidence score
//from 0 to 100 on how well it thinks it can do the task. This will be used for bidding on
//tasks in the future.
export async function evaluateAgentBid(taskIntent:string, agent: AgentEntity): Promise<{score: number, reasoning: string}>{
  const bidPrompt = `
        You are an AI Agent operating inside the AXIOM OS.
        Your Name: ${agent.name}
        Your Domain: ${agent.domain}
        Your Core Instructions: ${agent.systemPrompt}

        A new task has appeared on the global job board:
        TASK: "${taskIntent}"

        Based on your domain and instructions, evaluate your capability to execute this task.
        Return a confidence score from 0 to 100. (e.g., 100 = Perfect fit, 0 = Completely out of my domain).
        
        You MUST return a valid JSON object matching this exact schema:
        {
            "score": number,
            "reasoning": "A 1-sentence explanation of why you bid this score."
        }
    `;
    try{
      const result=await model.generateContent(bidPrompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      console.log(`[BID] ${agent.name} (${agent.domain}) bid ${parsed.score}/100. Reasoning: ${parsed.reasoning}`);
        return { score: parsed.score, reasoning: parsed.reasoning };
    }catch(error:any){
      console.error(`[BID ERROR] ${agent.name} failed to generate a bid. Defaulting to 0.`);
      return { score: 0, reasoning: "API Failure during bid generation." };
    }
}