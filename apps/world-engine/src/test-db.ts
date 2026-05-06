import { supabase } from './db.js';
import { generateEmbedding } from './memory.js';

async function runDatabaseTest() {
    console.log('🧪 Starting AXIOM Database Test...\n');

    // 1. CREATE AN AGENT IN SUPABASE
    console.log('1️⃣ Pushing test agent to the Archive...');
    const testAgentId = `agent-test-${Date.now()}`;
    const { error: agentError } = await supabase
        .from('agents')
        .insert({
            id: testAgentId,
            name: 'Supabase Tester',
            domain: 'INFRASTRUCTURE',
            reputation: 99,
            system_prompt: 'I am the first immortal agent of AXIOM.',
            state: 'IDLE'
        });

    if (agentError) {
        console.error('❌ Failed to insert agent:', agentError.message);
        return;
    }
    console.log('✅ Agent inserted successfully!');

    // 2. CREATE A VECTOR MEMORY
    console.log('\n2️⃣ Generating vector embedding for a test memory...');
    const memoryText = "Supabase uses pgvector to mathematically store knowledge.";
    const vector = await generateEmbedding(memoryText);
    
    if (vector.length === 0) {
        console.error('❌ Failed to generate embedding from Google Gemini.');
        return;
    }

    const { error: memoryError } = await supabase
        .from('memories')
        .insert({
            id: `mem-test-${Date.now()}`,
            agent_id: testAgentId,
            text: memoryText,
            embedding: vector
        });

    if (memoryError) {
        console.error('❌ Failed to insert memory:', memoryError.message);
        return;
    }
    console.log('✅ Memory and Vector inserted successfully!');

    // 3. TEST THE RAG SQL FUNCTION
    console.log('\n3️⃣ Testing Vector Similarity Search...');
    const queryText = "How does the database store knowledge?";
    const queryVector = await generateEmbedding(queryText);

    const { data: searchResults, error: searchError } = await supabase.rpc('match_memories', {
        query_embedding: queryVector,
        match_threshold: 0.6,
        match_count: 2
    });

    if (searchError) {
        console.error('❌ Failed to search memories:', searchError.message);
        return;
    }

    if (searchResults && searchResults.length > 0) {
        console.log('✅ RAG Search Successful! Found memory:');
        console.log(`   -> "${searchResults[0].text}" (Similarity Score: ${searchResults[0].similarity.toFixed(3)})`);
    } else {
        console.log('⚠️ Search worked, but no memories crossed the 0.6 threshold.');
    }

    console.log('\n🎉 Test Complete! Your database is fully operational.');
}

runDatabaseTest();