import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually to be completely dependency-free
const envPath = path.resolve(process.cwd(), '.env.local');
const env: Record<string, string> = {};

try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals !== -1) {
      const key = trimmed.substring(0, firstEquals).trim();
      let value = trimmed.substring(firstEquals + 1).trim();
      // Remove enclosing quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  });
} catch (err) {
  console.error('Error reading .env.local file:', err);
  process.exit(1);
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project-id')) {
  console.error('Error: Please make sure your .env.local has valid NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'test@example.com';
  const password = 'password123';
  const fullName = 'Test User';

  console.log(`Connecting to Supabase at: ${supabaseUrl}...`);
  console.log(`Attempting to create verified test user: ${email}...`);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Mark email as pre-confirmed/verified!
    user_metadata: { full_name: fullName }
  });

  if (error) {
    if (error.message.includes('already exists') || error.message.includes('already registered')) {
      console.log(`\n🎉 The user "${email}" is already registered in your Supabase Auth database!`);
      console.log(`You can log in directly with:`);
      console.log(`  - Email: ${email}`);
      console.log(`  - Password: ${password}`);
    } else {
      console.error('\n❌ Failed to create user:', error.message);
    }
  } else {
    console.log(`\n🎉 SUCCESS! Test account created and verified!`);
    console.log(`You can now log in to VidBrief AI using:`);
    console.log(`  - Email: ${email}`);
    console.log(`  - Password: ${password}`);
  }
}

main();
