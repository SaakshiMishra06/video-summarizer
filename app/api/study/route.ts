import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseServer';
import { generateStudyMaterials } from '@/lib/gemini';

// GET /api/study?videoId=xxx  — fetch existing study materials
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('study_materials')
      .select('*')
      .eq('video_id', videoId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "no rows returned" — that's fine, means not generated yet
      throw error;
    }

    return NextResponse.json({ studyMaterial: data || null });
  } catch (error) {
    console.error('GET /api/study error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study materials' },
      { status: 500 }
    );
  }
}

// POST /api/study  — generate and save new study materials
export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // 1. Fetch the transcript
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .select('text')
      .eq('video_id', videoId)
      .single();

    if (transcriptError || !transcriptData?.text) {
      return NextResponse.json(
        { error: 'Transcript not found. Cannot generate study materials without a transcript.' },
        { status: 404 }
      );
    }

    // 2. Fetch video title
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('title')
      .eq('id', videoId)
      .single();

    if (videoError || !videoData?.title) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    // 3. Generate study materials via Gemini
    const generated = await generateStudyMaterials(transcriptData.text, videoData.title);

    // 4. Upsert into study_materials table
    const { data: saved, error: saveError } = await supabase
      .from('study_materials')
      .upsert(
        {
          video_id: videoId,
          flashcards: generated.flashcards,
          quiz: generated.quiz,
          revision_notes: generated.revision_notes,
        },
        { onConflict: 'video_id' }
      )
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    return NextResponse.json({ studyMaterial: saved });
  } catch (error) {
    console.error('POST /api/study error:', error);
    return NextResponse.json(
      { error: `Failed to generate study materials: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
