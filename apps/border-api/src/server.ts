// Border API — the only entry point for external tasks into EvolveOS
// Humans send work in through this API, it goes to the queue,
// and the World Engine picks it up and processes it.

import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import type { AgentDomain, TaskPacket } from '@axiom/types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Redis connection — read from env, fall back to localhost
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Create a BullMQ queue to send tasks to the World Engine
const taskQueue = new Queue('axiom-tasks', {
  connection: { host: REDIS_HOST, port: REDIS_PORT },
});

// Health check endpoint — useful for Docker/k8s probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'EvolveOS Border API is online' });
});

/**
 * POST /api/customs/in — Submit a new task to EvolveOS.
 * The user sends their intent (a natural language description of what they want),
 * and we create a TaskPacket and put it on the BullMQ queue.
 */
app.post('/api/customs/in', async (req, res) => {
  const { intent } = req.body;

  // Validate that an intent was provided
  if (!intent) {
    res.status(400).json({ error: 'Intent is required' });
    return;
  }

  // Build the task packet
  const taskPacketMade: TaskPacket = {
    id: uuidv4(),
    intent,
    status: 'QUEUED',
    createdAt: Date.now(),
    domain: 'CODER' as AgentDomain, // Default domain for external tasks
  };

  try {
    console.log(`[CUSTOMS] Task Packet ${taskPacketMade.id} Created. Sending to Queue...`);

    // Put the task on the BullMQ queue — the World Engine will pick it up
    await taskQueue.add('process-task', taskPacketMade);

    res.json({
      message: 'Your request has been received and is being processed. You can track the progress with the tracking id.',
      trackingId: taskPacketMade.id,
    });
  } catch (error: unknown) {
    // If Redis is down or something else fails, return a proper error
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CUSTOMS ERROR] Failed to enqueue task: ${message}`);
    res.status(500).json({ error: 'Failed to process your request. Please try again later.' });
  }
});

// Start the server
const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => {
  console.log(`[BORDER] EvolveOS Border API is running on port ${port}`);
});
