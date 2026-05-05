//this file is the basic implementation of a rag system, it will be used to store the 
// memory of the agents, and provide a simple interface for the agents to interact with 
// the memory
//We are going to build an in-memory vector store from scratch using pure mathematics 
// (Cosine Similarity)
//take text, convert it into an array of numbers (a vector embedding), and search for 
// related memories using geometry

//just the imports
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI=new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
//model for converting text to embeddings(just an array of numbers)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });