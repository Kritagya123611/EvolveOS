//this file would wait for the queue to have a task packet and then simulate a 
//fake ai agent for now to process the task for 3 seconds and then mark it as completed with a fake result

// apps/world-engine/src/queue.ts
import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';
import { assignTaskToAgents } from './dispatcher.js';
import { getAgentById, unlockAgent } from './registry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

console.log('evolveos World Engine Booting... Listening for tasks on the Job Board.');

// The Worker represents an Agent monitoring the Job Board for new tasks to process.
//i have to remove the demo worker for now and integrate the assignTaskToAgents function in the 
// dispatcher.ts file with this worker so that when a new task packet is added to the queue, it would 
// automatically call the assignTaskToAgents function to assign the task to the appropriate agents 
// based on the algorithm.
const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;

  console.log(`[JOB CLAIMED] Task ID: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);

  try {
    const assignmentResult = assignTaskToAgents(task, 'CODER');
    
    if (!assignmentResult) throw new Error('Worker Starvation: No agents currently available.');

    const leadAgent = getAgentById(assignmentResult.leadAgentId);
    const shadowAgent = assignmentResult.shadowAgentId ? getAgentById(assignmentResult.shadowAgentId) : undefined;

    console.log(`[EXECUTION] Lead: ${leadAgent?.name} is processing the task...`);

    const leadPrompt = `
      SYSTEM INSTRUCTIONS: ${leadAgent?.systemPrompt}
      HUMAN TASK: ${task.intent}
      
      Execute this task. Provide only the architectural solution or code.
    `;
    
    const leadResponse = await model.generateContent(leadPrompt);
    const leadOutput = leadResponse.response.text();
    console.log(`[LLM CORE] ${leadAgent?.name} successfully generated the solution.`);

    let shadowOutput = '';
    if (shadowAgent) {
      console.log(`[MENTORSHIP] Shadow: ${shadowAgent.name} is observing and learning...`);
      
      const shadowPrompt = `
        SYSTEM INSTRUCTIONS: ${shadowAgent.systemPrompt}
        
        The Senior Architect just wrote this solution:
        ${leadOutput}
        
        As a junior dev, write a 2-sentence summary of the core design pattern used here so you can save it to your memory.
      `;
      
      const shadowResponse = await model.generateContent(shadowPrompt);
      shadowOutput = shadowResponse.response.text();
      console.log(`[LLM CORE] ${shadowAgent.name} synthesized the architectural pattern.`);
    }

    unlockAgent(assignmentResult.leadAgentId);
    if (assignmentResult.shadowAgentId) unlockAgent(assignmentResult.shadowAgentId);
    
    console.log(`[STATUS] Execution finished. Agent locks released.`);

    const finalResult = shadowAgent 
      ? `### Senior Agent Output:\n${leadOutput}\n\n### Junior Agent Notes:\n${shadowOutput}`
      : `### Senior Agent Output:\n${leadOutput}`;

    return { 
      ...task, 
      status: 'COMPLETED', 
      result: finalResult, 
      completedAt: Date.now() 
    } as TaskPacket;

  } catch (error: any) {
    console.error(`[DISPATCHER] Error occurred: ${error.message}`);
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
