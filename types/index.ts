export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VideoSourceType = 'upload' | 'youtube';

export interface Video {
  id: string;
  user_id: string;
  title: string;
  video_url: string | null;
  source_type: VideoSourceType;
  duration_seconds: number | null;
  status: VideoStatus;
  error_message: string | null;
  created_at: string;
}

export interface TranscriptSegment {
  start: number; // in seconds
  end: number; // in seconds
  text: string;
}

export interface Transcript {
  id: string;
  video_id: string;
  text: string;
  segments: TranscriptSegment[];
  created_at: string;
}

export interface VideoChapter {
  timestamp: string; // e.g. "01:23"
  timeInSeconds: number;
  title: string;
  description: string;
}

export interface VideoSummary {
  id: string;
  video_id: string;
  short_summary: string;
  detailed_summary: string;
  bullet_points: string[];
  key_insights: string[];
  chapters: VideoChapter[];
  linkedin_post: string | null;
  twitter_thread: string[] | null;
  created_at: string;
}

export type ProcessingStep =
  | 'uploading'
  | 'extracting_audio'
  | 'transcribing'
  | 'summarizing'
  | 'completed'
  | 'failed';

export interface ProcessingStatus {
  id: string;
  video_id: string;
  step: ProcessingStep;
  progress: number; // 0 to 100
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
