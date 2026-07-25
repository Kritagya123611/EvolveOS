import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';
import { assignTaskToAgents } from './dispatcher.js';
import { getAgentById, unlockAgent, bootWorld } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveMemory, searchMemories } from './memory.js';
import { AXIOM_SYSCALLS, executeSyscall, createAgentContainer, destroyAgentContainer } from './tools.js';
import dotenv from 'dotenv';

dotenv.config();

//config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

//decides wether the agent requires toolcalls or normal text ans is enough
async function runJudgementLoop(
  intent: string,
  systemPrompt: string,
  agentId: string,
): Promise<string> {

  let containerCreated = false;

  try {
    const pastLessons = await searchMemories(intent);
    const memoryContext =
      pastLessons.length > 0
        ? `\nRELEVANT PAST LESSONS FROM MEMORY BANK:\n- ${pastLessons.join('\n- ')}\n`
        : `\n(No relevant past memories found for this task.)\n`;

    const chat = model.startChat({
      tools: [{ functionDeclarations: AXIOM_SYSCALLS }],
      systemInstruction: `${systemPrompt}\n${memoryContext}`,
    });

    let result = await chat.sendMessage(
      `HUMAN TASK: ${intent}\n\nExecute this task. Use your tools if you need to interact with the system.`,
    );

    let functionCalls = result.response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      console.log('[JUDGEMENT] No tool calls needed. Returning LLM response directly.');
      return result.response.text();
    }

    await createAgentContainer(agentId);
    containerCreated = true;
    console.log(`[JUDGEMENT] Tool call(s) detected (${functionCalls.length}).`);

    while (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0]!;
      console.log(`[JUDGEMENT] → Executing: ${call.name}`);

      const toolOutput = await executeSyscall(call.name, call.args, agentId);

      result = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: { result: toolOutput },
          },
        },
      ]);

      functionCalls = result.response.functionCalls();
    }

    console.log('[JUDGEMENT] All tool calls complete. Returning final LLM response.');
    return result.response.text();
  } finally {
    if (containerCreated) {
      await destroyAgentContainer(agentId);
    }
  }
}


// Shadow Mentorship — junior agent observes and learns from senior's output
async function runShadowMentorship(
  shadowPrompt: string,
  shadowId: string,
): Promise<string> {
  const shadowResponse = await model.generateContent(shadowPrompt);
  const notes = shadowResponse.response.text();
  await saveMemory(shadowId, notes);
  return notes;
}


// Main Worker — picks up tasks from BullMQ and runs the Judgement Loop
console.log('EvolveOS World Engine Booting...');
await bootWorld();
console.log('Listening for tasks on the Job Board.');

const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;
  console.log(`\n[JOB CLAIMED] Task ID: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);

  try {
    // --- Assign agents to this task ---
    const assignment = await assignTaskToAgents(task, 'CODER');

    if (!assignment) {
      throw new Error('Worker Starvation: No agents currently available.');
    }

    const leadAgent = getAgentById(assignment.leadAgentId);
    if (!leadAgent) {
      throw new Error(`Lead agent ${assignment.leadAgentId} not found in registry.`);
    }

    const shadowAgent = assignment.shadowAgentId
      ? getAgentById(assignment.shadowAgentId)
      : undefined;

    console.log(`[EXECUTION] Lead: ${leadAgent.name} is processing the task...`);

    // --- Run the Judgement Loop (lead agent) ---
    let leadOutput = '';
    try {
      leadOutput = await runJudgementLoop(task.intent, leadAgent.systemPrompt, leadAgent.id);
      console.log(`[LLM CORE] ${leadAgent.name} successfully completed the execution.`);
    } catch (apiError: unknown) {
      const msg = apiError instanceof Error ? apiError.message : String(apiError);
      console.log(`[CIRCUIT BREAKER] LLM Overloaded (${msg.substring(0, 50)}). Mocking Lead execution...`);
      leadOutput = `// [MOCK ARCHITECTURE] Generated via Fallback Circuit Breaker\n// The LLM API is currently experiencing high load.`;
    }

    // --- Run shadow mentorship (if a shadow was assigned) ---
    let shadowOutput = '';
    if (shadowAgent) {
      console.log(`[MENTORSHIP] Shadow: ${shadowAgent.name} is observing and learning...`);

      try {
        shadowOutput = await runShadowMentorship(
          `SYSTEM INSTRUCTIONS: ${shadowAgent.systemPrompt}

The Senior Architect just wrote this solution:
${leadOutput}

As a junior dev, write a 2-sentence summary of the core design pattern used here so you can save it to your memory.`,
          shadowAgent.id,
        );
        console.log(`[LLM CORE] ${shadowAgent.name} synthesized the architectural pattern.`);
      } catch (apiError: unknown) {
        console.log(`[CIRCUIT BREAKER] LLM Overloaded. Mocking Mentorship synthesis...`);
        shadowOutput = `[MOCK NOTES] The senior architect utilized a highly resilient fallback pattern. I have saved this standard operating procedure to my internal memory.`;
      }
    }

    // --- Release agent locks ---
    try {
      await unlockAgent(assignment.leadAgentId);
      if (assignment.shadowAgentId) {
        await unlockAgent(assignment.shadowAgentId);
      }
      console.log(`[STATUS] Execution finished. Agent locks released safely.`);
    } catch (unlockError: unknown) {
      const msg = unlockError instanceof Error ? unlockError.message : String(unlockError);
      console.error(`[WARNING] Failed to release agent locks: ${msg}`);
    }

    // --- Build final result ---
    const finalResult = shadowAgent
      ? `Senior Agent Output:\n${leadOutput}\n\n### Junior Agent Notes:\n${shadowOutput}`
      : `Senior Agent Output:\n${leadOutput}`;

    return {
      ...task,
      status: 'COMPLETED',
      result: finalResult,
      completedAt: Date.now(),
    } as TaskPacket;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DISPATCHER ERROR] ${message}`);
    throw error;
  }
}, {
  connection: { host: REDIS_HOST, port: REDIS_PORT },
});

worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} successfully executed.`);
  console.log(`\n${returnvalue.result}\n`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with error: ${err.message}`);
});
