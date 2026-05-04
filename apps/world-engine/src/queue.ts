//this file would wait for the queue to have a task packet and then simulate a 
//fake ai agent for now to process the task for 3 seconds and then mark it as completed with a fake result

// apps/world-engine/src/queue.ts
import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';
import { assignTaskToAgents } from './dispatcher.js';
import { getAgentById, unlockAgent } from './registry.js';

console.log('evolveos World Engine Booting... Listening for tasks on the Job Board.');

// The Worker represents an Agent monitoring the Job Board for new tasks to process.
//i have to remove the demo worker for now and integrate the assignTaskToAgents function in the 
// dispatcher.ts file with this worker so that when a new task packet is added to the queue, it would 
// automatically call the assignTaskToAgents function to assign the task to the appropriate agents 
// based on the algorithm.
const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;
  
  console.log(`\n=================================================`);
  console.log(`[JOB CLAIMED] Task ID: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);
  console.log(`[STATUS] Dispatcher evaluating available agents...`);

  try {
    // 1. Call the dispatcher (hardcoding 'CODER' domain for this MVP)
    const assignmentResult = assignTaskToAgents(task, 'CODER');
    
    if (!assignmentResult) {
      // Throwing an error tells BullMQ to put the task back in the queue to try later
      throw new Error('Worker Starvation: No agents currently available.');
    }

    // 2. Identify the active agents
    const leadAgent = getAgentById(assignmentResult.leadAgentId);
    const shadowAgent = assignmentResult.shadowAgentId ? getAgentById(assignmentResult.shadowAgentId) : undefined;

    console.log(`[DISPATCHER] Task assigned successfully. Mode: ${assignmentResult.mode}`);
    console.log(`[EXECUTION] Lead: ${leadAgent?.name} is processing the task...`);
    
    if (shadowAgent) {
      console.log(`[MENTORSHIP] Shadow: ${shadowAgent.name} is observing the execution and learning...`);
    }

    // 3. Simulate the Agent's computation time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. CRITICAL: Release the atomic locks so agents can take new work!
    unlockAgent(assignmentResult.leadAgentId);
    if (assignmentResult.shadowAgentId) {
      unlockAgent(assignmentResult.shadowAgentId);
    }
    
    console.log(`[STATUS] Execution finished. Agent locks released.`);

    // 5. Construct the final output
    const completedTask: TaskPacket = { 
      ...task, 
      status: 'COMPLETED', 
      result: `[Result] Handled autonomously by ${leadAgent?.name}`, 
      completedAt: Date.now() 
    };

    return completedTask;

  } catch (error: any) {
    console.error(`[DISPATCHER] Error occurred: ${error.message}`);
    throw error; 
  }
}, {
  connection: { host: '127.0.0.1', port: 6379 }
});

worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} successfully executed and returned to memory.`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with error: ${err.message}`);
});
