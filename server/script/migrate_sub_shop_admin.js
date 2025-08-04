import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const runMigration = async () => {
  try {
    console.log('Starting migration for sub-shop admin fields...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/add_sub_shop_admin_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration using Supabase's rpc function or direct SQL
    // Note: Supabase doesn't support direct ALTER TABLE through the client
    // We'll need to run this through the Supabase dashboard or use a different approach
    
    console.log('Migration SQL:');
    console.log(migrationSQL);
    
    console.log('\n⚠️  IMPORTANT: This migration needs to be run manually in your Supabase dashboard.');
    console.log('Please go to your Supabase project dashboard and run the following SQL in the SQL editor:');
    console.log('\n' + migrationSQL);
    
    console.log('\nMigration script completed. Please run the SQL manually in Supabase dashboard.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration(); 