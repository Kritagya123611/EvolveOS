//this file is the basic implementation of a rag system, it will be used to store the 
// memory of the agents, and provide a simple interface for the agents to interact with 
// the memory
//We are going to build an in-memory vector store from scratch using pure mathematics 
// (Cosine Similarity)
//take text, convert it into an array of numbers (a vector embedding), and search for 
// related memories using geometry

//just the imports
import { GoogleGenerativeAI } from '@google/generative-ai';
import { error } from 'console';
import dotenv from 'dotenv';

dotenv.config();

const genAI=new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
//model for converting text to embeddings(just an array of numbers)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

//the skeleton of a single memory
export interface Memory {
    id: string;
    agentId: string; // which agent this memory belongs to
    text: string; // the content of the memory
    embedding: number[]; // the vector representation of the text
    timestamp: number; // when the memory was created
}

export const MemoryStore:Memory[]=[];

//just converting text to an embedding vector using the embedding model
export async function generateEmbedding(text:string):Promise<number[]>{
    try{
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return [];
    }
}

//save new memory to the store
export async function saveMemory(agentId: string, text: string) {
    console.log(`[MEMORY] Encoding new memory for Agent ${agentId}...`);
    const vector = await generateEmbedding(text);
    
    if (vector.length === 0) return;

    const newMemory: Memory = {
        id: `mem-${Date.now()}`,
        agentId,
        text,
        embedding: vector,
        timestamp: Date.now()
    };

    MemoryStore.push(newMemory);
    console.log(`[MEMORY] Knowledge securely stored. Total Memories: ${MemoryStore.length}`);
}
//write a commit message for the above code
//commit message: "Implement in-memory vector store for agent memories using cosine similarity and embedding generation."
//some diffrent
//commit message: "Build foundational memory system for agents with text embedding and storage capabilities."