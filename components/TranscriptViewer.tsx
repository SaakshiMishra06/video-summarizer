'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/lib/utils';
import { Transcript } from '@/types';
import { Search, Copy, Download, Check, Sparkles } from 'lucide-react';

interface TranscriptViewerProps {
  transcript: Transcript;
  activeTime?: number; // Option to sync with a video player
  onTimestampClick?: (seconds: number) => void;
}

export default function TranscriptViewer({ transcript, activeTime = 0, onTimestampClick }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Copy full transcript to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };

  // Export transcript as a text file
  const handleDownload = () => {
    const textBlob = transcript.segments
      .map((seg) => `[${formatTime(seg.start)}] ${seg.text}`)
      .join('\r\n\r\n');
      
    const blob = new Blob([textBlob], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${transcript.video_id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Safe search match highlight
  const highlightSearchText = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-violet-500/30 text-violet-200 border-b border-violet-400/50 py-0.5 rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Filter segments containing query
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return transcript.segments;
    return transcript.segments.filter((seg) => 
      seg.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transcript.segments, searchQuery]);

  return (
    <Card className="glass-panel border-white/5 bg-slate-900/10 flex flex-col h-[600px] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/5 pb-4">
        <div>
          <CardTitle className="text-xl flex items-center space-x-2">
            <span>Video Transcript</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-white/5 text-slate-400">
              {transcript.segments.length} blocks
            </span>
          </CardTitle>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopy} 
            className="text-slate-400 hover:text-slate-200"
            leftIcon={copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDownload} 
            className="text-slate-400 hover:text-slate-200"
            leftIcon={<Download className="h-4 w-4" />}
          >
            TXT
          </Button>
        </div>
      </CardHeader>

      {/* Search Bar */}
      <div className="p-4 border-b border-white/5 bg-slate-950/20">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search words inside transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Scrollable text container */}
      <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
        {filteredSegments.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <Search className="h-8 w-8 mx-auto text-slate-700 animate-pulse" />
            <p className="text-xs font-medium font-outfit">No search results match "{searchQuery}"</p>
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isHighlighted = highlightedIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  setHighlightedIndex(idx);
                  if (onTimestampClick) onTimestampClick(seg.start);
                }}
                className={`flex items-start space-x-3.5 p-3 rounded-xl cursor-pointer transition border border-transparent ${
                  isHighlighted 
                    ? 'bg-violet-500/10 border-violet-500/20 shadow-md shadow-violet-500/5' 
                    : 'hover:bg-slate-900/40 hover:border-white/5'
                }`}
              >
                <button
                  type="button"
                  className="flex-shrink-0 px-2 py-1 rounded bg-slate-950/60 border border-slate-800 hover:border-violet-500/40 text-[10px] font-mono font-bold text-violet-400 tracking-wider transition"
                >
                  {formatTime(seg.start)}
                </button>
                <p className="text-slate-300 text-sm font-sans leading-relaxed flex-1 mt-0.5">
                  {highlightSearchText(seg.text, searchQuery)}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
