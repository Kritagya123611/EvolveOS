import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv';

dotenv.config();

const genAI=new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });

//the skeleton of a single memory
export interface Memory {
    id: string;
    agentId: string; 
    text: string; 
    embedding: number[]; 
    timestamp: number; 
}

export const MemoryStore:Memory[]=[];

//just converting text to an embedding vector using the embedding model
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error: any) {
        console.log(`[CIRCUIT BREAKER] Google API 404. Generating local 768-D vector...`);
        // just a fallback if api gives error
        const vector = new Array(768).fill(0);
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            vector[i % 768] += charCode;
            vector[(i * 7) % 768] += charCode * 0.5; 
        }
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + (val * val), 0));
        if (magnitude === 0) return vector;
        
        return vector.map(val => val / magnitude);
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

//cosine similarity function to compare two vectors(just the dot product)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    const minLength = Math.min(vecA.length, vecB.length);
    for(let i=0;i<minLength;i++){
        const valA = vecA[i] ?? 0;
        const valB = vecB[i] ?? 0;
        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

//function for searching a memory from the memory store
export async function searchMemories(query: string,topK: number = 5):Promise<Memory[]>{
  if (MemoryStore.length === 0) return [];

  const queryVector = await generateEmbedding(query);
  if (!queryVector || queryVector.length === 0) return [];

  const scored: { memory: Memory; score: number }[] = [];

  for (const memory of MemoryStore) {
    const score = cosineSimilarity(queryVector, memory.embedding);
    scored.push({ memory, score });
  }
  scored.sort((a, b) => b.score - a.score);

  const threshold = 0.6;
  const filtered = scored.filter(item => item.score >= threshold);

  return filtered.slice(0, topK).map(item => item.memory);
}
