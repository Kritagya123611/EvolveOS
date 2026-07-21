import type { TaskPacket, AgentDomain, AgentEntity } from '@axiom/types';
import { AgentRegistry, lockAgent } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini for the bid evaluation process
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' }, // Force strict JSON output
});

const SENIOR_THRESHOLD = 80.0;
const JUNIOR_THRESHOLD = 40.0;

/**
 * Assign a task to the best available agents.
 * - The highest bidder becomes the Lead (senior) agent
 * - The lowest bidder becomes the Shadow (junior) agent for mentorship
 *
 * Returns null if no agents are available for the required domain.
 */
export async function assignTaskToAgents(
  task: TaskPacket,
  requiredDomain: AgentDomain
): Promise<{ leadAgentId: string; shadowAgentId?: string } | null> {
  console.log(`\n[DISPATCHER] Evaluating task ${task.id} for agent assignment...`);

  // Find all idle agents in the required domain
  const availableAgents: AgentEntity[] = AgentRegistry.filter(
    (a) => a.state === 'IDLE' && a.domain === requiredDomain
  );

  if (availableAgents.length === 0) {
    console.log(`[DISPATCHER] No available agents for ${requiredDomain}. Task will wait.`);
    return null;
  }

  // Each agent places a bid on how well they can handle this task
  const bidPromises = availableAgents.map(async (agent) => {
    const bid = await evaluateAgentBid(task.intent, agent);
    return { agent, ...bid };
  });

  const auctionResults = await Promise.all(bidPromises);

  // Sort by score — highest bidder wins
  auctionResults.sort((a, b) => b.score - a.score);

  if (auctionResults.length === 0) {
    console.log('[DISPATCHER] Auction completed with no bids.');
    return null;
  }

  // Lock the winning agent so it can't be assigned another task
  const winner = auctionResults[0]!;
  await lockAgent(winner.agent.id);
  console.log(`[AUCTION CLOSED] Winner: ${winner.agent.name} (${winner.score}/100).`);

  // If there are multiple agents, the lowest bidder becomes the shadow (junior)
  let shadowAgentId: string | undefined = undefined;

  if (auctionResults.length > 1) {
    const loser = auctionResults[auctionResults.length - 1]!;
    await lockAgent(loser.agent.id);
    shadowAgentId = loser.agent.id;
    console.log(`[DISPATCHER] Shadow assigned: ${loser.agent.name} (Score: ${loser.score}) needs to learn this domain.`);
  }

  return {
    leadAgentId: winner.agent.id,
    ...(shadowAgentId ? { shadowAgentId } : {}),
  };
}

/**
 * Ask the Gemini LLM to score how well a specific agent can handle a task.
 * Returns a score (0-100) and a one-sentence reasoning.
 */
async function evaluateAgentBid(
  taskIntent: string,
  agent: AgentEntity
): Promise<{ score: number; reasoning: string }> {
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

  try {
    const result = await model.generateContent(bidPrompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    console.log(`[BID] ${agent.name} (${agent.domain}) bid ${parsed.score}/100. Reasoning: ${parsed.reasoning}`);
    return { score: parsed.score, reasoning: parsed.reasoning };
  } catch (error: unknown) {
    console.error(`[BID ERROR] ${agent.name} failed to generate a bid. Defaulting to 0.`);
    return { score: 0, reasoning: 'API Failure during bid generation.' };
  }
}
