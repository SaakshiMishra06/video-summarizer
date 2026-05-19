import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { chatWithTranscript } from '@/lib/gemini';

export const maxDuration = 30; // 30 seconds max duration for chatbot response

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    // 2. Parse request parameters
    const { videoId, message, history } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 3. Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('user_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video record not found' }, { status: 404 });
    }

    if (video.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to this video content' }, { status: 403 });
    }

    // 4. Fetch the transcript text
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('text')
      .eq('video_id', videoId)
      .single();

    if (transcriptError || !transcript) {
      return NextResponse.json({ error: 'No transcript found for this video. Please wait for it to process.' }, { status: 404 });
    }

    // 5. Call Gemini Chat
    console.log(`[Chat] Sourcing QA response for video ${videoId} from user message: ${message.substring(0, 50)}...`);
    
    // Verify Gemini API Key exists
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      throw new Error('Gemini API Key is not configured in environment variables.');
    }

    const aiResponse = await chatWithTranscript(transcript.text, history || [], message);

    return NextResponse.json({ response: aiResponse }, { status: 200 });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate chat response' },
      { status: 500 }
    );
  }
}
