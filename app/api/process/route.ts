import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

import { fetchYoutubeTranscript } from '@/lib/youtube';
import { generateVideoSummary } from '@/lib/gemini';
import { OpenAI } from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const maxDuration = 300; // 5 minutes max duration for Vercel/Serverless processing

export async function POST(request: NextRequest) {
  let videoId = '';
  
  // Set up Supabase
  const supabase = getSupabaseServerClient();

  try {
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    // 2. Read Request
    const { videoId: reqVideoId } = await request.json();
    if (!reqVideoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    videoId = reqVideoId;

    // Since in Supabase client we use standard queries:
    const { data: dbVideo, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !dbVideo) {
      return NextResponse.json({ error: 'Video record not found' }, { status: 404 });
    }

    if (dbVideo.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to this video' }, { status: 403 });
    }

    // 4. Update status to processing
    await supabase.from('videos').update({ status: 'processing' }).eq('id', videoId);
    await updateStatus(supabase, videoId, 'extracting_audio', 10);

    let transcriptText = '';
    let segments: any[] = [];

    if (dbVideo.source_type === 'youtube') {
      console.log(`[Processing] Starting YouTube transcript fetch for: ${dbVideo.video_url}`);
      
      const transcriptResult = await fetchYoutubeTranscript(dbVideo.video_url);

      if (transcriptResult) {
        transcriptText = transcriptResult.text;
        segments = transcriptResult.segments;
        console.log(`[Processing] YouTube captions fetched successfully. Length: ${transcriptText.length}`);
      } else {
        console.log('[Processing] YouTube captions extraction failed or unavailable. Falling back to downloading audio and using Whisper.');
        
        // Verify OpenAI API key exists
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
          throw new Error('OpenAI API Key is not configured in environment variables.');
        }

        // Extract video ID
        const videoIdMatch = dbVideo.video_url.match(/(?:v=|\/embed\/|\/v\/|youtu\.be\/)([^#\&\?]+)/);
        if (!videoIdMatch) {
          throw new Error(`Failed to extract video ID from YouTube URL: ${dbVideo.video_url}`);
        }
        const ytVideoId = videoIdMatch[1];

        await updateStatus(supabase, videoId, 'extracting_audio', 20);

        const tempAudioPath = path.join(os.tmpdir(), `${dbVideo.id}.mp3`);
        const downloaderScript = path.resolve(process.cwd(), 'scripts/download-youtube-audio.py');

        console.log(`[Processing] Downloading YouTube audio for ${ytVideoId} via yt-dlp...`);
        try {
          const { stdout, stderr } = await execFilePromise('python3', [downloaderScript, ytVideoId, tempAudioPath]);
          if (stderr) {
            console.log(`[Processing YouTube Downloader Stderr]: ${stderr}`);
          }
          
          const parsedOutput = JSON.parse(stdout.trim());
          if (parsedOutput.error) {
            throw new Error(`YouTube downloader failed: ${parsedOutput.error}`);
          }
          console.log(`[Processing] YouTube audio downloaded successfully to ${tempAudioPath}`);
        } catch (downloadErr: any) {
          throw new Error(`Failed to download YouTube audio: ${downloadErr.message}`);
        }

        await updateStatus(supabase, videoId, 'transcribing', 50);
        console.log(`[Processing] Initiating Whisper transcription for YouTube audio: ${tempAudioPath}`);

        // Call OpenAI Whisper API
        try {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const transcription = await openai.audio.transcriptions.create({
            file: createReadStream(tempAudioPath),
            model: 'whisper-1',
            response_format: 'verbose_json',
          });

          transcriptText = transcription.text;
          segments = (transcription as any).segments?.map((seg: any) => ({
            start: seg.start,
            end: seg.end,
            text: seg.text,
          })) || [{ start: 0, end: 10, text: transcriptText }];
          
          console.log(`[Processing] OpenAI Whisper transcribing completed. Words: ${transcriptText.split(' ').length}`);
        } catch (whisperErr) {
          throw new Error(`Whisper transcription failed for YouTube video: ${whisperErr instanceof Error ? whisperErr.message : String(whisperErr)}`);
        } finally {
          // Cleanup temp file
          await fs.unlink(tempAudioPath).catch(() => {});
        }
      }
    } else {
      // source_type === 'upload'
      console.log(`[Processing] Downloading uploaded video from: ${dbVideo.video_url}`);
      await updateStatus(supabase, videoId, 'extracting_audio', 20);

      // Verify API key exists
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        throw new Error('OpenAI API Key is not configured in environment variables.');
      }

      // Download file to temp folder
      const downloadResponse = await fetch(dbVideo.video_url);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download video from storage. Code: ${downloadResponse.status}`);
      }
      
      const fileArrayBuffer = await downloadResponse.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      
      const tempVideoPath = path.join(os.tmpdir(), `${dbVideo.id}.mp4`);
      const tempAudioPath = path.join(os.tmpdir(), `${dbVideo.id}.mp3`);
      
      await fs.writeFile(tempVideoPath, fileBuffer);
      console.log(`[Processing] Video written locally to ${tempVideoPath}. Running FFmpeg...`);
      await updateStatus(supabase, videoId, 'extracting_audio', 40);

      // Run FFmpeg to extract audio
      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempVideoPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .audioChannels(1)
            .audioBitrate(128)
            .on('start', (cmd) => console.log('FFmpeg spawned:', cmd))
            .on('end', () => {
              console.log('FFmpeg audio extraction complete.');
              resolve();
            })
            .on('error', (err) => {
              console.error('FFmpeg extraction error:', err);
              reject(err);
            })
            .save(tempAudioPath);
        });
      } catch (ffmpegErr) {
        // Cleanup temp file
        await fs.unlink(tempVideoPath).catch(() => {});
        throw new Error(`Audio extraction failed via FFmpeg: ${ffmpegErr instanceof Error ? ffmpegErr.message : String(ffmpegErr)}`);
      }

      await updateStatus(supabase, videoId, 'transcribing', 50);
      console.log(`[Processing] Initiating Whisper transcription for: ${tempAudioPath}`);

      // Call OpenAI Whisper API
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const transcription = await openai.audio.transcriptions.create({
          file: createReadStream(tempAudioPath),
          model: 'whisper-1',
          response_format: 'verbose_json',
        });

        transcriptText = transcription.text;
        segments = (transcription as any).segments?.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })) || [{ start: 0, end: 10, text: transcriptText }];
        
        console.log(`[Processing] OpenAI Whisper transcribing completed. Words: ${transcriptText.split(' ').length}`);
      } catch (whisperErr) {
        throw new Error(`Whisper transcription failed: ${whisperErr instanceof Error ? whisperErr.message : String(whisperErr)}`);
      } finally {
        // Cleanup temp files
        await fs.unlink(tempVideoPath).catch(() => {});
        await fs.unlink(tempAudioPath).catch(() => {});
      }
    }

    // 5. Store Transcript in database
    await updateStatus(supabase, videoId, 'transcribing', 70);
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        video_id: videoId,
        text: transcriptText,
        segments: segments,
      });

    if (transcriptError) {
      console.error('Database transcript insert error:', transcriptError);
      throw new Error(`Saving transcript to database failed: ${transcriptError.message}`);
    }

    // 6. Generate AI Summary using Google Gemini
    await updateStatus(supabase, videoId, 'summarizing', 80);
    console.log(`[Processing] Sourcing Gemini summary for: ${dbVideo.title}`);

    // Verify Gemini API Key exists
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      throw new Error('Gemini API Key is not configured in environment variables.');
    }

    const aiSummary = await generateVideoSummary(transcriptText, dbVideo.title);

    // Save summary inside DB
    const { error: summaryError } = await supabase
      .from('summaries')
      .insert({
        video_id: videoId,
        short_summary: aiSummary.short_summary,
        detailed_summary: aiSummary.detailed_summary,
        bullet_points: aiSummary.bullet_points,
        key_insights: aiSummary.key_insights,
        chapters: aiSummary.chapters,
        linkedin_post: aiSummary.linkedin_post,
        twitter_thread: aiSummary.twitter_thread,
      });

    if (summaryError) {
      console.error('Database summary insert error:', summaryError);
      throw new Error(`Saving AI summary to database failed: ${summaryError.message}`);
    }

    // 7. Complete Processing
    await updateStatus(supabase, videoId, 'completed', 100);
    await supabase
      .from('videos')
      .update({ status: 'completed' })
      .eq('id', videoId);

    console.log(`[Processing] VidBrief AI pipeline completed successfully for video: ${videoId}`);
    return NextResponse.json({ success: true, videoId }, { status: 200 });

  } catch (error) {
    console.error(`[Processing Error] Pipeline failed for video ${videoId}:`, error);
    
    // Update video and status DB rows to failed
    if (videoId) {
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Processing failed',
        })
        .eq('id', videoId);
        
      await updateStatus(supabase, videoId, 'failed', 0);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

// Database helper to update progress steps
async function updateStatus(supabase: any, videoId: string, step: string, progress: number) {
  await supabase
    .from('processing_status')
    .update({
      step,
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq('video_id', videoId);
}
