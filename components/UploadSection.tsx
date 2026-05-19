'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  Upload, 
  Youtube, 
  FileVideo, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Clock,
  Mic,
  BookOpen,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UploadSectionProps {
  onUploadSuccess?: () => void;
}

export default function UploadSection({ onUploadSuccess }: UploadSectionProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Pipeline State
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('idle');
  const [stepProgress, setStepProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMsg('');
    
    // Validate file type
    if (!selectedFile.type.startsWith('video/mp4') && !selectedFile.name.endsWith('.mp4')) {
      setErrorMsg('Invalid file format. Please upload an MP4 video.');
      return;
    }

    // Validate size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      setErrorMsg('File exceeds 50MB limit. Please compress your video or use a YouTube link.');
      return;
    }

    setFile(selectedFile);
  };

  // Poll database status during processing
  const startPollingStatus = (videoId: string) => {
    let attempts = 0;
    const maxAttempts = 150; // 5 minutes max polling (150 * 2s)

    const interval = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setErrorMsg('The processing request timed out on our servers. Please check your Dashboard history in a moment.');
        setIsProcessing(false);
        return;
      }

      try {
        // Query the processing status
        const { data, error } = await supabase
          .from('processing_status')
          .select('step, progress')
          .eq('video_id', videoId)
          .single();

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        if (data) {
          setCurrentStep(data.step);
          setStepProgress(data.progress);

          if (data.step === 'completed' || data.progress === 100) {
            clearInterval(interval);
            setIsProcessing(false);
            setSuccessMsg('Briefing successfully generated!');
            
            // Celebration confetti!
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 }
            });

            // Trigger parent refresh
            if (onUploadSuccess) onUploadSuccess();
            
            // Redirect to the newly created briefing page
            setTimeout(() => {
              router.push(`/dashboard/video/${videoId}`);
            }, 1800);
          } else if (data.step === 'failed') {
            clearInterval(interval);
            setIsProcessing(false);
            
            // Fetch detailed error message
            const { data: videoData } = await supabase
              .from('videos')
              .select('error_message')
              .eq('id', videoId)
              .single();
              
            setErrorMsg(videoData?.error_message || 'Processing failed at a server-level step.');
          }
        }
      } catch (err) {
        console.error('Database polling error:', err);
      }
    }, 2000);
  };

  const handleProcessPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);
    setUploadProgress(0);
    setCurrentStep('uploading');
    setStepProgress(10);

    try {
      let videoId = '';

      if (activeTab === 'youtube') {
        if (!youtubeUrl) {
          setErrorMsg('Please input a valid YouTube URL');
          setIsProcessing(false);
          return;
        }

        // Register YouTube Video
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            youtubeUrl,
            title: youtubeTitle.trim() || undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to register YouTube video');
        
        videoId = data.videoId;
        setStepProgress(100);
      } else {
        // Handle MP4 Local Upload
        if (!file) {
          setErrorMsg('Please upload a video file first.');
          setIsProcessing(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ""));

        // Use standard upload but capture response
        setCurrentStep('uploading');
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to upload video');

        videoId = data.videoId;
        setStepProgress(100);
      }

      // KICK OFF THE PIPELINE PROCESSING (FFmpeg + Whisper + Gemini)
      // Note: We trigger the POST to /api/process. We don't necessarily await its response in a blocking way
      // because we are polling the database row. We can fire it off, but we run the fetch call.
      console.log(`[Frontend] Successfully registered video. ID: ${videoId}. Spawning background pipeline...`);
      setCurrentStep('extracting_audio');
      setStepProgress(10);

      // Start polling the DB state *before* firing the processing request to ensure we capture initial logs
      startPollingStatus(videoId);

      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      if (!processResponse.ok) {
        const processData = await processResponse.json();
        throw new Error(processData.error || 'Pipeline execution failed.');
      }

    } catch (err: any) {
      console.error('Pipeline process error:', err);
      setErrorMsg(err.message || 'Pipeline processing failed. Check connection.');
      setIsProcessing(false);
    }
  };

  const getStepText = (step: string) => {
    switch (step) {
      case 'uploading':
        return 'Uploading video source to cloud storage...';
      case 'extracting_audio':
        return 'FFmpeg extracting high quality audio layer...';
      case 'transcribing':
        return 'OpenAI Whisper decoding speech to timestamped text...';
      case 'summarizing':
        return 'Google Gemini synthesizing summaries, chapters & posts...';
      case 'completed':
        return 'Generation successful! Finalizing visual elements...';
      case 'failed':
        return 'Failed. Sourcing error details...';
      default:
        return 'Initializing pipelines...';
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'uploading':
        return <Upload className="h-6 w-6 text-violet-400 animate-bounce" />;
      case 'extracting_audio':
        return <Volume2 className="h-6 w-6 text-violet-400 animate-pulse" />;
      case 'transcribing':
        return <Mic className="h-6 w-6 text-violet-400 animate-pulse" />;
      case 'summarizing':
        return <BookOpen className="h-6 w-6 text-fuchsia-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-emerald-400 animate-pulse" />;
      default:
        return <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />;
    }
  };

  return (
    <Card className="glass-panel border-white/5 bg-slate-900/30 overflow-visible relative shadow-xl">
      <div className="absolute -top-4 -right-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 rounded-full text-white text-xs font-semibold font-outfit shadow-md flex items-center space-x-1">
        <Sparkles className="h-3 w-3 animate-pulse" />
        <span>SaaS Powered</span>
      </div>

      <CardContent className="pt-6">
        {/* Step-by-Step active Overlay during processing */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl z-20 flex flex-col items-center justify-center p-6 md:p-8 text-center animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/5 p-4.5 rounded-2xl shadow-xl shadow-violet-500/5 mb-6 flex items-center justify-center relative">
              <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-violet-500/10 opacity-75"></span>
              {getStepIcon(currentStep)}
            </div>

            <h3 className="font-outfit font-bold text-xl text-slate-100 tracking-wide">
              {currentStep === 'completed' ? 'Processing Complete!' : 'Synthesizing Video Briefing'}
            </h3>
            
            <p className="text-slate-400 text-sm mt-2 max-w-sm font-sans">
              {getStepText(currentStep)}
            </p>

            {/* Custom Premium progress bar */}
            <div className="w-full max-w-md bg-slate-900 border border-white/5 rounded-full h-3 mt-8 overflow-hidden p-0.5 shadow-inner">
              <div 
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stepProgress}%` }}
              ></div>
            </div>
            
            <span className="text-xs font-semibold text-violet-400 mt-2 font-outfit tracking-wider uppercase">
              Step progress: {stepProgress}%
            </span>

            <div className="mt-8 flex items-center space-x-4.5 justify-center opacity-40">
              <div className={cn("flex flex-col items-center space-y-1.5", currentStep === 'uploading' && "opacity-100 font-bold")}>
                <div className="h-2 w-2 rounded-full bg-violet-400"></div>
                <span className="text-[10px] uppercase tracking-wider font-semibold">Upload</span>
              </div>
              <div className="h-px w-6 bg-slate-800"></div>
              <div className={cn("flex flex-col items-center space-y-1.5", currentStep === 'extracting_audio' && "opacity-100 font-bold")}>
                <div className="h-2 w-2 rounded-full bg-violet-400"></div>
                <span className="text-[10px] uppercase tracking-wider font-semibold">Audio</span>
              </div>
              <div className="h-px w-6 bg-slate-800"></div>
              <div className={cn("flex flex-col items-center space-y-1.5", currentStep === 'transcribing' && "opacity-100 font-bold")}>
                <div className="h-2 w-2 rounded-full bg-violet-400"></div>
                <span className="text-[10px] uppercase tracking-wider font-semibold">Whisper</span>
              </div>
              <div className="h-px w-6 bg-slate-800"></div>
              <div className={cn("flex flex-col items-center space-y-1.5", currentStep === 'summarizing' && "opacity-100 font-bold")}>
                <div className="h-2 w-2 rounded-full bg-fuchsia-400"></div>
                <span className="text-[10px] uppercase tracking-wider font-semibold">Gemini</span>
              </div>
            </div>
          </div>
        )}

        {/* Normal Form View */}
        <div className="flex border-b border-white/5 mb-6 p-0.5 bg-slate-950/60 rounded-xl max-w-sm">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 py-2 text-xs font-semibold font-outfit rounded-lg tracking-wider uppercase cursor-pointer transition',
              activeTab === 'upload'
                ? 'bg-slate-900 border border-white/5 text-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <FileVideo className="h-4 w-4" />
            <span>MP4 Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 py-2 text-xs font-semibold font-outfit rounded-lg tracking-wider uppercase cursor-pointer transition',
              activeTab === 'youtube'
                ? 'bg-slate-900 border border-white/5 text-fuchsia-400'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Youtube className="h-4 w-4" />
            <span>YouTube Link</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleProcessPipeline}>
          {activeTab === 'upload' ? (
            /* local file drag drop dropzone */
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden group',
                  dragActive 
                    ? 'border-violet-500 bg-violet-950/10 shadow-lg shadow-violet-500/5' 
                    : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/50'
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".mp4"
                  className="hidden"
                />
                
                <div className="bg-slate-900 border border-white/5 p-3.5 rounded-2xl group-hover:scale-110 transition duration-300 mb-4 shadow-sm">
                  <Upload className="h-6 w-6 text-violet-400 group-hover:text-violet-300 transition" />
                </div>

                <h4 className="font-outfit font-semibold text-slate-200 tracking-wide">
                  {file ? file.name : 'Select or Drag MP4 Video'}
                </h4>
                
                <p className="text-slate-400 text-xs mt-1.5 max-w-xs font-sans">
                  {file 
                    ? `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB - Click to change`
                    : 'MP4 support only. Maximized at 50MB file size limit for serverless processing.'}
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3.5 rounded-xl font-semibold"
                disabled={!file}
              >
                Upload & Generate Briefing
              </Button>
            </div>
          ) : (
            /* YouTube URL form fields */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase pl-1">
                  YouTube Video Link
                </label>
                <div className="relative">
                  <Youtube className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
                    Custom Title (Optional)
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Leave blank to use auto-generated title"
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3.5 rounded-xl font-semibold mt-2"
                disabled={!youtubeUrl}
              >
                Injest & Generate Briefing
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
