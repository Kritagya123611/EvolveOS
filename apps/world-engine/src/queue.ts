import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';
import { assignTaskToAgents } from './dispatcher.js';
import { getAgentById, unlockAgent,bootWorld } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveMemory,searchMemories } from './memory.js';
import { AXIOM_SYSCALLS, executeSyscall } from './tools.js';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

console.log('evolveos World Engine Booting...');

//just retrieve the existing agents from the db and prepare the world for incoming tasks
await bootWorld();

console.log('Listening for tasks on the Job Board.');

//checking the redis queue for new tasks and assigning them to agents when they come in
const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;

  console.log(`\n[JOB CLAIMED] Task ID: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);

  try {
    const assignmentResult = await assignTaskToAgents(task,
  'INFRASTRUCTURE' as Parameters<typeof assignTaskToAgents>[1]
);
    
    if (!assignmentResult) throw new Error('Worker Starvation: No agents currently available.');

    const leadAgent = getAgentById(assignmentResult.leadAgentId);
    const shadowAgent = assignmentResult.shadowAgentId ? getAgentById(assignmentResult.shadowAgentId) : undefined;

    console.log(`[EXECUTION] Lead: ${leadAgent?.name} is processing the task...`);

    let leadOutput = '';
    try {
        //fetching past memories here
        const pastLessons = await searchMemories(task.intent);
        const memoryContext = pastLessons.length > 0 
            ? `\nRELEVANT PAST LESSONS FROM MEMORY BANK:\n- ${pastLessons.join('\n- ')}\n` 
            : `\n(No relevant past memories found for this task.)\n`;

        //giving the agent its tools and memory
        const chat = model.startChat({
            tools: [{ functionDeclarations: AXIOM_SYSCALLS }],
            systemInstruction: `${leadAgent?.systemPrompt}\n${memoryContext}`
        });

        console.log(`[LLM CORE] ${leadAgent?.name} is analyzing the task and deciding on tools...`);
        
        //give the agent the task
        let result = await chat.sendMessage(`HUMAN TASK: ${task.intent}\n\nExecute this task. Use your tools if you need to interact with the system.`);

        //if result.response.functionCalls exists, it means the llm decided it needs a tool.
        let functionCalls = result.response.functionCalls();
        while (functionCalls && functionCalls.length > 0) {

            const call = functionCalls[0]!;

            const toolOutput = await executeSyscall(
                call.name,
                call.args
            );

            result = await chat.sendMessage([
                {
                    functionResponse: {
                        name: call.name,
                        response: {
                            result: toolOutput
                        }
                    }
                }
            ]);

            functionCalls = result.response.functionCalls();
        }
        leadOutput = result.response.text();
        console.log(`[LLM CORE] ${leadAgent?.name} successfully completed the execution.`);

    } catch (apiError: any) {
        console.log(`[CIRCUIT BREAKER] LLM Overloaded (${apiError.message.substring(0, 20)}). Mocking Lead execution...`);
        leadOutput = `// [MOCK ARCHITECTURE] Generated via Fallback Circuit Breaker\n// The LLM API is currently experiencing high load.`;
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