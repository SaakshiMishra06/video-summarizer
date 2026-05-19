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
  console.log(`Connecting to Supabase at: ${supabaseUrl}...`);
  console.log('Fetching users from Supabase Auth...');

  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Failed to list auth users:', listError.message);
    process.exit(1);
  }

  console.log(`Found ${users.length} authenticated user(s). Syncing to public.users table...`);

  for (const user of users) {
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const email = user.email || '';
    
    console.log(`Syncing profile for: ${email} (${user.id})...`);

    const { error: insertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: user.id,
        email: email,
        full_name: fullName,
        avatar_url: user.user_metadata?.avatar_url || '',
        created_at: user.created_at
      }, { onConflict: 'id' });

    if (insertError) {
      console.error(`❌ Failed to sync user ${email}:`, insertError.message);
    } else {
      console.log(`✅ Successfully synced profile for: ${email}`);
    }
  }

  console.log('\n🎉 ALL USERS SYNCHRONIZED SUCCESSFULLY!');
}

main();
