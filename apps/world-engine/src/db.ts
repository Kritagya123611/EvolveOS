import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws'; 

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false 
    },
    realtime: {
        transport: ws 
    } as any,
    global: {
        WebSocket: ws 
    } as any
});

console.log('[DATABASE] Connected to AXIOM World Archive.');