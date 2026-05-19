import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export const maxDuration = 60; // 60 seconds max duration for the API route

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    
    // 2. Handle YouTube URL Registration
    if (contentType.includes('application/json')) {
      const { youtubeUrl, title } = await request.json();

      if (!youtubeUrl) {
        return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
      }

      // Basic YouTube URL validation
      const ytRegExp = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
      if (!ytRegExp.test(youtubeUrl)) {
        return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      }

      const match = youtubeUrl.match(/(?:v=|\/embed\/|\/v\/|youtu\.be\/)([^#\&\?]+)/);
      const videoId = match ? match[1] : 'youtube_video';
      const videoTitle = title || `YouTube Video (${videoId})`;

      // Insert video row
      const { data: video, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: videoTitle,
          video_url: youtubeUrl,
          source_type: 'youtube',
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error inserting video in DB:', dbError);
        return NextResponse.json({ error: 'Database registration failed' }, { status: 500 });
      }

      // Initialize processing status
      await supabase
        .from('processing_status')
        .insert({
          video_id: video.id,
          step: 'uploading',
          progress: 100,
        });

      return NextResponse.json({ videoId: video.id, status: 'pending' }, { status: 200 });
    }

    // 3. Handle File Upload (Multipart Form Data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const customTitle = formData.get('title') as string;

      if (!file) {
        return NextResponse.json({ error: 'No video file uploaded' }, { status: 400 });
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
      }

      // Validate file size (e.g. max 50MB for server processing)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        return NextResponse.json({ error: 'Video file too large (Max 50MB)' }, { status: 400 });
      }

      const fileExtension = file.name.split('.').pop() || 'mp4';
      const cleanFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
      const videoTitle = customTitle || file.name.replace(/\.[^/.]+$/, "");

      // Convert File to ArrayBuffer and upload to Supabase Storage
      const fileBuffer = await file.arrayBuffer();
      const { data: storageData, error: storageError } = await supabase.storage
        .from('videos')
        .upload(cleanFileName, fileBuffer, {
          contentType: file.type,
          upsert: true,
        });

      if (storageError) {
        console.error('Storage upload error:', storageError);
        return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(cleanFileName);

      // Insert video row
      const { data: video, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: videoTitle,
          video_url: publicUrl,
          source_type: 'upload',
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error inserting video in DB:', dbError);
        return NextResponse.json({ error: 'Database registration failed' }, { status: 500 });
      }

      // Initialize processing status
      await supabase
        .from('processing_status')
        .insert({
          video_id: video.id,
          step: 'uploading',
          progress: 100,
        });

      return NextResponse.json({ videoId: video.id, status: 'pending' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unsupported Content Type' }, { status: 400 });

  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}
