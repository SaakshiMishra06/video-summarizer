'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import UploadSection from '@/components/UploadSection';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { VideoSkeletonList } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { Video } from '@/types';
import { 
  Play, 
  Trash2, 
  Clock, 
  Youtube, 
  FileVideo, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Eye,
  History
} from 'lucide-react';

export default function DashboardPage() {
  const supabase = getSupabaseBrowserClient();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch videos helper
  const fetchVideos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Load history on mount
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Set up Supabase real-time subscription to auto-update status changes on the dashboard!
  useEffect(() => {
    const channel = supabase
      .channel('videos_status_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos' },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchVideos]);

  const handleDelete = async (videoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this video briefing and all its generated summaries/transcripts?')) {
      return;
    }

    setDeletingId(videoId);
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      // Update state
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err) {
      console.error('Delete video error:', err);
      alert('Failed to delete video. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300">
        
        {/* Welcome Headers */}
        <div>
          <h2 className="text-3xl font-bold font-outfit text-slate-100 tracking-wide">
            VidBrief Workspace
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Upload files or drop links to generate summaries and exportable marketing assets.
          </p>
        </div>

        {/* Upload Dashboard Section */}
        <div className="grid grid-cols-1 gap-6">
          <UploadSection onUploadSuccess={fetchVideos} />
        </div>

        {/* Recent History Grid */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-white/5">
            <History className="h-5 w-5 text-violet-400" />
            <h3 className="font-outfit font-bold text-xl text-slate-200 tracking-wide">
              Recent Video Briefings
            </h3>
          </div>

          {loading ? (
            <VideoSkeletonList />
          ) : videos.length === 0 ? (
            <Card className="glass-panel border-white/5 bg-slate-900/10 text-center py-16">
              <CardContent className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-slate-800/40 rounded-2xl border border-slate-700/50 flex items-center justify-center text-slate-400 mb-2">
                  <FileVideo className="h-6 w-6" />
                </div>
                <h4 className="text-slate-300 font-semibold font-outfit text-base">No briefings generated yet</h4>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Select your local MP4 file or paste a YouTube video link above to launch your first AI-synthesized report!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="glass-panel border-white/5 bg-slate-900/20 hover:bg-slate-900/40 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-300 group"
                >
                  <Link 
                    href={video.status === 'completed' ? `/dashboard/video/${video.id}` : '#'}
                    className="flex items-start space-x-4 flex-1 min-w-0"
                  >
                    <div className="p-3 bg-slate-800/50 border border-white/5 rounded-xl text-slate-300 flex-shrink-0 group-hover:scale-105 transition">
                      {video.source_type === 'youtube' ? (
                        <Youtube className="h-6 w-6 text-rose-500" />
                      ) : (
                        <FileVideo className="h-6 w-6 text-violet-400" />
                      )}
                    </div>
                    
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-outfit font-bold text-slate-200 group-hover:text-violet-400 transition truncate text-sm sm:text-base leading-tight pr-4">
                        {video.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-400 font-sans">
                        <span>Created: {formatDate(video.created_at)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="capitalize">{video.source_type} video</span>
                      </div>
                    </div>
                  </Link>

                  {/* Actions & Badges */}
                  <div className="flex items-center space-x-4 flex-shrink-0 self-end sm:self-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                    {getStatusBadge(video.status)}

                    {video.status === 'completed' && (
                      <Link href={`/dashboard/video/${video.id}`}>
                        <button
                          className="p-2.5 bg-violet-600/10 hover:bg-violet-600 border border-violet-500/20 text-violet-300 hover:text-white rounded-xl transition cursor-pointer"
                          title="View briefing details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                    )}

                    <button
                      onClick={(e) => handleDelete(video.id, e)}
                      disabled={deletingId === video.id}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white rounded-xl transition disabled:opacity-50 cursor-pointer"
                      title="Delete briefing"
                    >
                      {deletingId === video.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
