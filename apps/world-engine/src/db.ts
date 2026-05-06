import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws'; // <-- Changed to 'ws'

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Since this is a server, we don't need browser localStorage
    },
    realtime: {
        transport: ws // Exactly what the error suggested
    } as any,
    global: {
        WebSocket: ws // Fallback global injection
    } as any
});

console.log('🔗 [DATABASE] Connected to AXIOM World Archive.');