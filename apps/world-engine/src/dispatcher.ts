import crypto from 'crypto';
import type { TaskPacket, JobRecord, AgentDomain, AgentEntity } from '@axiom/types';
import { AgentRegistry, lockAgent } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" } // Force strict JSON output
});

const SENIOR_THRESHOLD = 80.0;
const JUNIOR_THRESHOLD = 40.0;

export async function assignTaskToAgents(task: TaskPacket,requiredDomain: AgentDomain): Promise<{ leadAgentId: string, shadowAgentId?: string } | null> {
  console.log(`\n[DISPATCHER] Evaluating task ${task.id} for agent assignment...`);
 
  const availableAgents: AgentEntity[] = AgentRegistry
    .filter(a => a.state === 'IDLE' && a.domain === requiredDomain);

  if (availableAgents.length === 0) {
    console.log(`[DISPATCHER] No available agents for ${requiredDomain}. Task will wait.`);
    return null;
  }

  const bidPromises = availableAgents.map(async (agent) => {
        const bid = await evaluateAgentBid(task.intent, agent);
        return { agent, ...bid };
    });

  const auctionResults = await Promise.all(bidPromises);

    auctionResults.sort((a, b) => b.score - a.score);

    if (auctionResults.length === 0) {
      console.log('[DISPATCHER] Auction completed with no bids.');
      return null;
    }

    const winner = auctionResults[0]!;
    
    lockAgent(winner.agent.id);
    console.log(`[AUCTION CLOSED] Winner: ${winner.agent.name} (${winner.score}/100).`);

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