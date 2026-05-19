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

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('Fetching latest video registered in database...');

  const { data: videos, error } = await supabaseAdmin
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error querying videos:', error.message);
    process.exit(1);
  }

  if (!videos || videos.length === 0) {
    console.log('No videos found in database.');
    return;
  }

  const lastVideo = videos[0];
  console.log(`\n🎉 Found last registered video:`);
  console.log(`  - ID: ${lastVideo.id}`);
  console.log(`  - Title: ${lastVideo.title}`);
  console.log(`  - URL: ${lastVideo.video_url}`);
  console.log(`  - Source Type: ${lastVideo.source_type}`);
  console.log(`  - Status: ${lastVideo.status}`);
  console.log(`  - Error Message: ${lastVideo.error_message}`);
}

main();
