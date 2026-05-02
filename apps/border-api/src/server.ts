//this file will have the express logic where the taskpacket would come and be validated 
//then it would be put on the redis queue for the world engine to pick up
//basically this is packaging the human request into the taskpacket and putting it on the queue
//and finally the world engine would pick it up and process it

import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import type { TaskPacket } from '@axiom/types';

const app = express();
app.use(cors());
app.use(express.json());

const taskQueue=new Queue('taskQueue',{
    connection: { host: '127.0.0.1', port: 6379 }
})

//the route where the human would send the request to
app.post("api/customs/in",async(req,res)=>{
    const {intent}=req.body;
    if(!intent){
        return res.status(400).json({error:"Intent is required"});
    }
    const taskPacketMade:TaskPacket={
        id: uuidv4(),
        intent,
        status:'QUEUED',
        createdAt: Date.now()
    }
    console.log(`Task Packet ${taskPacketMade.id} Created at Customs. Sending to Queue...`);
    //"process-task" here is the job type
    await taskQueue.add('process-task', taskPacketMade)
    //send the tracking id back to the human so they can track the progress of their request
    res.json({
        message:"Your request has been received and is being processed.You can track the progress with the tracking id.",
        trackingId: taskPacketMade.id
    })

    const port=3000;
    app.listen(port,()=>{
        console.log(`Border API is running on port ${port}`);
})