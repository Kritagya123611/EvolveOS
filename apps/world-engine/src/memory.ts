import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Google AI client for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Each memory is a vector embedding + the original text + metadata
export interface Memory {
  id: string;
  agentId: string;
  text: string;
  embedding: number[];
  timestamp: number;
}

// In-memory store for all agent memories
export const MemoryStore: Memory[] = [];

//trying with gemini 
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use the latest embedding model from Google
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error: unknown) {
    console.log(`[CIRCUIT BREAKER] Google API 404. Generating local 768-D vector...`);

    // calculate the dot product if the api not responding
    const vector = new Array(768).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      vector[i % 768] += charCode;
      vector[(i * 7) % 768] += charCode * 0.5;
    }

    // Normalize the vector to unit length (required for cosine similarity)
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;

    return vector.map((val) => val / magnitude);
  }
}


//Save a new memory for an agent.
 //Embeds the text and stores it in the in-memory vector store.
 
export async function saveMemory(agentId: string, text: string) {
  console.log(`[MEMORY] Encoding new memory for Agent ${agentId}...`);
  const vector = await generateEmbedding(text);

  if (vector.length === 0) return;

  const newMemory: Memory = {
    id: `mem-${Date.now()}`,
    agentId,
    text,
    embedding: vector,
    timestamp: Date.now(),
  };

  MemoryStore.push(newMemory);
  console.log(`[MEMORY] Knowledge securely stored. Total Memories: ${MemoryStore.length}`);
}

/**
 * Cosine similarity between two vectors.
 * Returns a number between -1 and 1 (1 = identical direction, 0 = orthogonal).
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const minLength = Math.min(vecA.length, vecB.length);

  for (let i = 0; i < minLength; i++) {
    const valA = vecA[i] ?? 0;
    const valB = vecB[i] ?? 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search for the most relevant memories for a given query.
 * Embeds the query, compares against all stored memories,
 * and returns the top-K matches above a similarity threshold.
 */
export async function searchMemories(query: string, topK: number = 5): Promise<Memory[]> {
  if (MemoryStore.length === 0) return [];

  const queryVector = await generateEmbedding(query);
  if (!queryVector || queryVector.length === 0) return [];

  // Score every memory by cosine similarity
  const scored: { memory: Memory; score: number }[] = [];
  for (const memory of MemoryStore) {
    const score = cosineSimilarity(queryVector, memory.embedding);
    scored.push({ memory, score });
  }

  // Sort by highest similarity first
  scored.sort((a, b) => b.score - a.score);

  // Only return memories above the threshold (0.6 = moderately similar)
  const threshold = 0.6;
  const filtered = scored.filter((item) => item.score >= threshold);

  return filtered.slice(0, topK).map((item) => item.memory);
}
