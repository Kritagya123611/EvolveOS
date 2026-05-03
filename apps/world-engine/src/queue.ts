//this file would wait for the queue to have a task packet and then simulate a 
//fake ai agent for now to process the task for 3 seconds and then mark it as completed with a fake result

// apps/world-engine/src/queue.ts
import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';

console.log('evolveos World Engine Booting... Listening for tasks on the Job Board.');

// The Worker represents an Agent monitoring the Job Board
const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;
  
  console.log(`\n[JOB CLAIMED] Agent picked up Task: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);
  console.log(`[STATUS] Transitioning to IN_PROGRESS...`);

  await new Promise(resolve => setTimeout(resolve, 2000));
 
  const simulatedOutput = `[Agent Output] I have processed your request: "${task.intent}". This is a simulated result.`;
  
  console.log(`[STATUS] Task COMPLETED.\n`);

  const completedTask: TaskPacket = { 
    ...task, 
    status: 'COMPLETED', 
    result: simulatedOutput, 
    completedAt: Date.now() 
  };

  return completedTask;
}, {
  connection: { host: '127.0.0.1', port: 6379 }
});

worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} successfully executed and returned to memory.`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with error: ${err.message}`);
});
