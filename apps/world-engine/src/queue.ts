import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';
import { assignTaskToAgents } from './dispatcher.js';
import { getAgentById, unlockAgent } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveMemory,searchMemories } from './memory.js';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

console.log('evolveos World Engine Booting... Listening for tasks on the Job Board.');

const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;

  console.log(`\n[JOB CLAIMED] Task ID: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);

  //We need the Junior Agent to Save memories, and the Senior Agent to Retrieve them before 
  //starting a task

  try {
    const assignmentResult = assignTaskToAgents(task, 'CODER');
    
    if (!assignmentResult) throw new Error('Worker Starvation: No agents currently available.');

    const leadAgent = getAgentById(assignmentResult.leadAgentId);
    const shadowAgent = assignmentResult.shadowAgentId ? getAgentById(assignmentResult.shadowAgentId) : undefined;

    console.log(`[EXECUTION] Lead: ${leadAgent?.name} is processing the task...`);

    let leadOutput = '';
    try {
        // --- FETCH PAST MEMORIES ---
        const pastLessons = await searchMemories(task.intent);
        const memoryContext = pastLessons.length > 0 
            ? `\nRELEVANT PAST LESSONS FROM MEMORY BANK:\n- ${pastLessons.join('\n- ')}\n` 
            : `\n(No relevant past memories found for this task.)\n`;

        // --- INJECT INTO CONTEXT ---
        const leadPrompt = `
          SYSTEM INSTRUCTIONS: ${leadAgent?.systemPrompt}
          ${memoryContext}
          HUMAN TASK: ${task.intent}
          
          Execute this task. Provide only the architectural solution or code. Use past lessons to avoid previous mistakes.
        `;
        
        const leadResponse = await model.generateContent(leadPrompt);
        leadOutput = leadResponse.response.text();
        console.log(`[LLM CORE] ${leadAgent?.name} successfully generated the solution.`);
    }catch (apiError: any) {
        console.log(`[CIRCUIT BREAKER] LLM Overloaded (${apiError.message.substring(0, 20)}). Mocking Lead execution...`);
        leadOutput = `// [MOCK ARCHITECTURE] Generated via Fallback Circuit Breaker\n// The LLM API is currently experiencing high load.\n\nfunction mockedExecute() {\n  console.log("Task executed successfully using local fallback logic.");\n}`;
    }

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
          // Save the shadow agent's notes to memory for future retrieval
          await saveMemory(shadowAgent.id, shadowOutput);
          console.log(`[LLM CORE] ${shadowAgent.name} synthesized the architectural pattern.`);
      } catch (apiError: any) {
          console.log(`[CIRCUIT BREAKER] LLM Overloaded. Mocking Mentorship synthesis...`);
          shadowOutput = `[MOCK NOTES] The senior architect utilized a highly resilient fallback pattern. I have saved this standard operating procedure to my internal memory.`;
      }
    }
    unlockAgent(assignmentResult.leadAgentId);
    if (assignmentResult.shadowAgentId) unlockAgent(assignmentResult.shadowAgentId);
    
    console.log(`[STATUS] Execution finished. Agent locks released safely.`);

    const finalResult = shadowAgent 
      ? `Senior Agent Output:\n${leadOutput}\n\n### Junior Agent Notes:\n${shadowOutput}`
      : `Senior Agent Output:\n${leadOutput}`;

    return { 
      ...task, 
      status: 'COMPLETED', 
      result: finalResult, 
      completedAt: Date.now() 
    } as TaskPacket;

  } catch (error: any) {
    console.error(`[DISPATCHER ERROR] ${error.message}`);
    throw error;
  }
}, {
  connection: { host: '127.0.0.1', port: 6379 }
});

worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} successfully executed.`);
  console.log(`\n${returnvalue.result}\n`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with error: ${err.message}`);
});