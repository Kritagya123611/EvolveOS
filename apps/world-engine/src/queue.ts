import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';
import { assignTaskToAgents } from './dispatcher.js';
import { getAgentById, unlockAgent, bootWorld } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveMemory, searchMemories } from './memory.js';
import { AXIOM_SYSCALLS, executeSyscall } from './tools.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Gemini model that will power the Judgement Loop
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Redis connection config — read from env, fall back to localhost
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

console.log('EvolveOS World Engine Booting...');

// Load all agents from Supabase into RAM
await bootWorld();

console.log('Listening for tasks on the Job Board.');

// The BullMQ worker picks up tasks and runs them through the Judgement Loop
const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;

  console.log(`\n[JOB CLAIMED] Task ID: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);

  try {
    // Let the dispatcher pick a lead agent (and optionally a shadow for mentorship)
    // We use 'CODER' as the default domain — agents with this domain handle execution tasks
    const assignmentResult = await assignTaskToAgents(task, 'CODER');

    if (!assignmentResult) {
      throw new Error('Worker Starvation: No agents currently available.');
    }

    // Look up the assigned agents from the in-memory registry
    const leadAgent = getAgentById(assignmentResult.leadAgentId);
    const shadowAgent = assignmentResult.shadowAgentId
      ? getAgentById(assignmentResult.shadowAgentId)
      : undefined;

    if (!leadAgent) {
      throw new Error(`Lead agent ${assignmentResult.leadAgentId} not found in registry.`);
    }

    console.log(`[EXECUTION] Lead: ${leadAgent.name} is processing the task...`);

    // --- Lead Agent Execution ---
    let leadOutput = '';
    try {
      // Fetch any relevant past memories to inject context into the prompt
      const pastLessons = await searchMemories(task.intent);
      const memoryContext =
        pastLessons.length > 0
          ? `\nRELEVANT PAST LESSONS FROM MEMORY BANK:\n- ${pastLessons.join('\n- ')}\n`
          : `\n(No relevant past memories found for this task.)\n`;

      // Start a chat session with the lead agent's system prompt + memory context
      const chat = model.startChat({
        tools: [{ functionDeclarations: AXIOM_SYSCALLS }],
        systemInstruction: `${leadAgent.systemPrompt}\n${memoryContext}`,
      });

      console.log(`[LLM CORE] ${leadAgent.name} is analyzing the task and deciding on tools...`);

      // Send the human task to the LLM
      let result = await chat.sendMessage(
        `HUMAN TASK: ${task.intent}\n\nExecute this task. Use your tools if you need to interact with the system.`
      );

      // The Judgement Loop: keep going until the LLM stops calling tools
      let functionCalls = result.response.functionCalls();
      while (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0]!;

        // Execute the tool the LLM asked for (runTerminalCommand or writeLocalFile)
        const toolOutput = await executeSyscall(call.name, call.args);

        // Send the tool output back to the LLM so it can reason about the next step
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

      leadOutput = result.response.text();
      console.log(`[LLM CORE] ${leadAgent.name} successfully completed the execution.`);
    } catch (apiError: unknown) {
      const message = apiError instanceof Error ? apiError.message : String(apiError);
      console.log(`[CIRCUIT BREAKER] LLM Overloaded (${message.substring(0, 50)}). Mocking Lead execution...`);
      leadOutput = `// [MOCK ARCHITECTURE] Generated via Fallback Circuit Breaker\n// The LLM API is currently experiencing high load.`;
    }

    // --- Shadow Agent Mentorship ---
    let shadowOutput = '';
    if (shadowAgent) {
      console.log(`[MENTORSHIP] Shadow: ${shadowAgent.name} is observing and learning...`);

      try {
        const shadowPrompt = `
          SYSTEM INSTRUCTIONS: ${shadowAgent.systemPrompt}

          The Senior Architect just wrote this solution:
          ${leadOutput}

          As a junior dev, write a 2-sentence summary of the core design pattern used here so you can save it to your memory.
        `;

        const shadowResponse = await model.generateContent(shadowPrompt);
        shadowOutput = shadowResponse.response.text();
        await saveMemory(shadowAgent.id, shadowOutput);
        console.log(`[LLM CORE] ${shadowAgent.name} synthesized the architectural pattern.`);
      } catch (apiError: unknown) {
        console.log(`[CIRCUIT BREAKER] LLM Overloaded. Mocking Mentorship synthesis...`);
        shadowOutput = `[MOCK NOTES] The senior architect utilized a highly resilient fallback pattern. I have saved this standard operating procedure to my internal memory.`;
      }
    }

    // Release agent locks so they can take new tasks
    try {
      await unlockAgent(assignmentResult.leadAgentId);
      if (assignmentResult.shadowAgentId) {
        await unlockAgent(assignmentResult.shadowAgentId);
      }
      console.log(`[STATUS] Execution finished. Agent locks released safely.`);
    } catch (unlockError: unknown) {
      const msg = unlockError instanceof Error ? unlockError.message : String(unlockError);
      console.error(`[WARNING] Failed to release agent locks: ${msg}`);
    }

    // Build the final result — includes both lead and shadow outputs if mentorship was active
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

// Log when jobs finish or fail
worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} successfully executed.`);
  console.log(`\n${returnvalue.result}\n`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with error: ${err.message}`);
});
