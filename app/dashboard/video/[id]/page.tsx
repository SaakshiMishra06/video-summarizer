'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import TranscriptViewer from '@/components/TranscriptViewer';
import SummaryTab from '@/components/SummaryTab';
import AIChatbox from '@/components/AIChatbox';
import { SummaryPageSkeleton } from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft, 
  Youtube, 
  FileVideo, 
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  FileText,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Video, Transcript, VideoSummary } from '@/types';

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Right side panel toggle: 'transcript' or 'chat'
  const [rightPanelTab, setRightPanelTab] = useState<'transcript' | 'chat'>('transcript');
  
  // HTML5 Video Ref
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  
  // YouTube Start Time State (forces iframe refresh with ?start=)
  const [ytStartTime, setYtStartTime] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }

        // 1. Fetch Video Metadata
        const { data: dbVideo, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoId)
          .single();

        if (videoError || !dbVideo) {
          throw new Error('Video briefing not found.');
        }

        if (dbVideo.user_id !== user.id) {
          throw new Error('Unauthorized access to this video briefing.');
        }

        setVideo(dbVideo);

        // If video failed to process, stop here
        if (dbVideo.status === 'failed') {
          throw new Error(dbVideo.error_message || 'Video processing failed at a server level.');
        }

        // If video is still processing, tell user to wait
        if (dbVideo.status !== 'completed') {
          return;
        }

        // 2. Fetch Transcript and Summary in Parallel
        const [transcriptRes, summaryRes] = await Promise.all([
          supabase.from('transcripts').select('*').eq('video_id', videoId).single(),
          supabase.from('summaries').select('*').eq('video_id', videoId).single(),
        ]);

        if (transcriptRes.error) {
          console.error('Transcript fetch error:', transcriptRes.error);
        } else {
          setTranscript(transcriptRes.data);
        }

        if (summaryRes.error) {
          console.error('Summary fetch error:', summaryRes.error);
        } else {
          setSummary(summaryRes.data);
        }

      } catch (err: any) {
        console.error('Error loading briefing details:', err);
        setErrorMsg(err.message || 'Failed to fetch briefing assets.');
      } finally {
        setLoading(false);
      }
    }

    if (videoId) {
      loadData();
    }
  }, [videoId, supabase, router]);

  // Handle seeking / clicking on a timestamp
  const handleTimestampSeek = (seconds: number) => {
    if (video?.source_type === 'youtube') {
      // For YouTube, we force the embedded Iframe to reload at the correct start second parameter
      setYtStartTime(Math.floor(seconds));
    } else if (videoPlayerRef.current) {
      // For local HTML5 MP4 player, seek directly via DOM
      videoPlayerRef.current.currentTime = seconds;
      videoPlayerRef.current.play().catch(() => {});
    }
  };

  // Helper to extract YouTube video ID
  const getYoutubeEmbedId = (url: string | null) => {
    if (!url) return '';
    const match = url.match(/(?:v=|\/embed\/|\/v\/|youtu\.be\/)([^#\&\?]+)/);
    return match ? match[1] : '';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" className="opacity-50">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <SummaryPageSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (errorMsg || !video) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto py-16 text-center space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 p-4.5 rounded-2xl inline-flex justify-center text-red-400">
            <AlertCircle className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="font-outfit font-bold text-xl text-slate-100">Briefing Sourcing Failed</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">{errorMsg}</p>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // If video is pending or processing (e.g. navigated here via direct URL)
  if (video.status !== 'completed') {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto py-16 text-center space-y-6">
          <div className="bg-violet-500/10 border border-violet-500/20 p-4.5 rounded-2xl inline-flex justify-center text-violet-400">
            <Clock className="h-10 w-10 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="font-outfit font-bold text-xl text-slate-100">Briefing In Progress</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">
              This video is currently being processed by our automated pipeline (FFmpeg extraction / Whisper transcription / Gemini synthesis). Please check back in a few moments.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full">
              Go to Workspace Dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const ytEmbedId = getYoutubeEmbedId(video.video_url);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
        
        {/* Header navigation and Title */}
        <div className="flex flex-col space-y-3.5 pb-4 border-b border-white/5">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} className="text-slate-400 hover:text-slate-200 pl-0">
              Back to Workspace
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-outfit text-slate-100 tracking-wide truncate">
                {video.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-sans">
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5 text-violet-400" />
                  <span>{formatDate(video.created_at)}</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center space-x-1">
                  {video.source_type === 'youtube' ? (
                    <Youtube className="h-3.5 w-3.5 text-rose-500" />
                  ) : (
                    <FileVideo className="h-3.5 w-3.5 text-violet-400" />
                  )}
                  <span className="capitalize">{video.source_type} video</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Work grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLS: Video Player & Summary briefing tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Media Player Container */}
            <Card className="glass-panel border-white/5 bg-slate-950 overflow-hidden relative shadow-2xl">
              <CardContent className="p-0">
                {video.source_type === 'youtube' && ytEmbedId ? (
                  /* YouTube embedded player */
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytEmbedId}?start=${ytStartTime}&autoplay=1`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                ) : video.video_url ? (
                  /* Native MP4 video player */
                  <div className="aspect-video w-full bg-black relative">
                    <video
                      ref={videoPlayerRef}
                      src={video.video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full flex items-center justify-center text-slate-600 bg-slate-900/40">
                    No playable source available.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generated AI summaries, Chapter breakdowns and social generator */}
            {summary ? (
              <SummaryTab 
                summary={summary} 
                videoTitle={video.title} 
                onChapterClick={handleTimestampSeek} 
              />
            ) : (
              <Card className="glass-panel border-white/5 py-12 text-center text-slate-500 font-sans">
                Briefing summaries not resolved for this briefing.
              </Card>
            )}
          </div>

          {/* RIGHT 1 COL: Secondary Toggle tabs for Searchable Transcript & Assistant Chat */}
          <div className="space-y-6">
            
            {/* Panel Selector Tab Switch */}
            <div className="flex border border-white/5 bg-slate-900/40 p-0.5 rounded-xl">
              <button
                onClick={() => setRightPanelTab('transcript')}
                className={`flex-1 py-2.5 text-xs font-semibold font-outfit rounded-lg tracking-wider uppercase cursor-pointer transition flex items-center justify-center space-x-2 ${
                  rightPanelTab === 'transcript'
                    ? 'bg-slate-950 border border-white/5 text-violet-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Transcript</span>
              </button>
              <button
                onClick={() => setRightPanelTab('chat')}
                className={`flex-1 py-2.5 text-xs font-semibold font-outfit rounded-lg tracking-wider uppercase cursor-pointer transition flex items-center justify-center space-x-2 ${
                  rightPanelTab === 'chat'
                    ? 'bg-slate-950 border border-white/5 text-fuchsia-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>AI Assistant</span>
              </button>
            </div>

            {/* Display active panel */}
            {rightPanelTab === 'transcript' ? (
              transcript ? (
                <TranscriptViewer 
                  transcript={transcript} 
                  onTimestampClick={handleTimestampSeek} 
                />
              ) : (
                <Card className="glass-panel border-white/5 py-12 text-center text-slate-500 font-sans">
                  Transcript could not be loaded.
                </Card>
              )
            ) : (
              <AIChatbox videoId={video.id} />
            )}

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
