import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Now safely access env variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'rec-kiosk-server'
    }
  }
});

const connectSupabase = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      throw error;
    }

    console.log('Supabase Connected Successfully');
    return supabase;
  } catch (error) {
    console.error(`Supabase Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export { supabase, connectSupabase };
