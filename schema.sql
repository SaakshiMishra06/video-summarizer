-- ====================================================================
-- VidBrief AI - Database Schema Configuration for Supabase
-- ====================================================================

-- 1. Profiles/Users Table
-- Stores user profile info synced from auth.users
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies for Users
create policy "Users can view and edit their own profile" on public.users
  for all using (auth.uid() = id);

-- Create profile sync trigger from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, users.full_name),
      avatar_url = coalesce(excluded.avatar_url, users.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Videos Table
-- Stores uploaded or referenced videos
create table if not exists public.videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  video_url text,
  source_type text check (source_type in ('upload', 'youtube')) not null,
  duration_seconds numeric,
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending' not null,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.videos enable row level security;

-- Create policies for Videos
create policy "Users can perform all operations on their own videos" on public.videos
  for all using (auth.uid() = user_id);

-- 3. Transcripts Table
-- Stores high fidelity video transcripts and segments
create table if not exists public.transcripts (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null unique,
  text text not null,
  segments jsonb not null, -- Array of { start: number, end: number, text: string }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.transcripts enable row level security;

-- Create policies for Transcripts
create policy "Users can view transcripts of their own videos" on public.transcripts
  for all using (
    exists (
      select 1 from public.videos 
      where videos.id = transcripts.video_id and videos.user_id = auth.uid()
    )
  );

-- 4. Summaries Table
-- Stores generated summaries, notes, insights, social content
create table if not exists public.summaries (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null unique,
  short_summary text not null,
  detailed_summary text not null,
  bullet_points jsonb not null, -- Array of strings
  key_insights jsonb not null, -- Array of strings
  chapters jsonb not null, -- Array of { timestamp: string, timeInSeconds: number, title: string, description: string }
  linkedin_post text,
  twitter_thread jsonb, -- Array of strings (tweets)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.summaries enable row level security;

-- Create policies for Summaries
create policy "Users can view summaries of their own videos" on public.summaries
  for all using (
    exists (
      select 1 from public.videos 
      where videos.id = summaries.video_id and videos.user_id = auth.uid()
    )
  );

-- 5. Processing Status Table
-- Tracks step-by-step progress for real-time dashboard UI updates
create table if not exists public.processing_status (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null unique,
  step text check (step in ('uploading', 'extracting_audio', 'transcribing', 'summarizing', 'completed', 'failed')) not null,
  progress integer default 0 not null, -- 0 to 100 value
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.processing_status enable row level security;

-- Create policies for Processing Status
create policy "Users can view processing_status of their own videos" on public.processing_status
  for all using (
    exists (
      select 1 from public.videos 
      where videos.id = processing_status.video_id and videos.user_id = auth.uid()
    )
  );

-- 6. Study Materials Table
-- Stores AI-generated study guides, flashcards, and quizzes
create table if not exists public.study_materials (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null unique,
  flashcards jsonb, -- Array of object: { question: string, answer: string }
  quiz jsonb, -- Array of object: { question: string, options: string[], correctAnswerIndex: number, explanation: string }
  revision_notes jsonb, -- Object containing sections, key terms, and summary
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.study_materials enable row level security;

-- Create policies for Study Materials
create policy "Users can perform actions on study_materials of their own videos" on public.study_materials
  for all using (
    exists (
      select 1 from public.videos 
      where videos.id = study_materials.video_id and videos.user_id = auth.uid()
    )
  );
