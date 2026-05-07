import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import type { AgentDomain, TaskPacket } from '@axiom/types';

const app = express();
app.use(cors());
app.use(express.json());

const taskQueue=new Queue('axiom-tasks',{
    connection: { host: '127.0.0.1', port: 6379 }
})
//just a route where the user sends his request with the intent 
//and we create a task packet and send it to the queue
app.post("/api/customs/in",async(req,res)=>{
    const {intent}=req.body;
    if(!intent){
        return res.status(400).json({error:"Intent is required"});
    }
    const taskPacketMade: TaskPacket = {
        id: uuidv4(),
        intent,
        status: 'QUEUED',
        createdAt: Date.now(),
        domain: 'default' as AgentDomain
    }
    console.log(`Task Packet ${taskPacketMade.id} Created at Customs. Sending to Queue...`);
    await taskQueue.add('process-task', taskPacketMade)
    res.json({
        message:"Your request has been received and is being processed.You can track the progress with the tracking id.",
        trackingId: taskPacketMade.id
    })
});

const port=3000;
app.listen(port,()=>{
    console.log(`Border API is running on port ${port}`);
});