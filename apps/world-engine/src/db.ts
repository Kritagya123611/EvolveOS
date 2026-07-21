import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

// Read Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env — set SUPABASE_URL and SUPABASE_ANON_KEY');
}

/**
 * Create the Supabase client with WebSocket transport.
 * We use the `ws` library because Node.js doesn't have a native WebSocket
 * implementation — this lets Supabase Realtime work in Node 20.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // We don't need session persistence for a backend service
  },
  realtime: {
    transport: ws as any, // Cast needed because Supabase types expect a different WebSocket interface
  },
  global: {
    WebSocket: ws as any,
  },
} as any);

console.log('[DATABASE] Connected to EvolveOS World Archive.');
