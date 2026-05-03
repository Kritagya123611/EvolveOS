//this file would wait for the queue to have a task packet and then simulate a 
//fake ai agent for now to process the task for 3 seconds and then mark it as completed with a fake result

// apps/world-engine/src/queue.ts
import { Worker, Job } from 'bullmq';
import type { TaskPacket } from '@axiom/types';
import { assignTaskToAgents } from './dispatcher.js';

console.log('evolveos World Engine Booting... Listening for tasks on the Job Board.');

// The Worker represents an Agent monitoring the Job Board for new tasks to process.
//i have to remove the demo worker for now and integrate the assignTaskToAgents function in the 
// dispatcher.ts file with this worker so that when a new task packet is added to the queue, it would 
// automatically call the assignTaskToAgents function to assign the task to the appropriate agents 
// based on the algorithm.
const worker = new Worker('axiom-tasks', async (job: Job) => {
  const task = job.data as TaskPacket;
  
  console.log(`\n[JOB CLAIMED] Agent picked up Task: ${task.id}`);
  console.log(`[INTENT] "${task.intent}"`);
  console.log(`[STATUS] Transitioning to IN_PROGRESS...`);

  try{
    // Call the dispatcher to assign the task to agents based on the algorithm
    const assignmentResult = assignTaskToAgents(task, task.domain);
    if(assignmentResult){
      console.log(`[DISPATCHER] Task ${task.id} assigned successfully.`);
    }else{
      console.error(`[DISPATCHER] Failed to assign Task ${task.id}.`);
    }
  } catch (error:any) {
    console.error(`[DISPATCHER] Error occurred while assigning Task ${task.id}: ${error.message}`);
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
