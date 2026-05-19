import { TranscriptSegment } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

function logDebug(message: string) {
  try {
    const logPath = path.resolve(process.cwd(), 'scripts/youtube-debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
    console.log(`[YouTube Debug] ${message}`);
  } catch (err) {
    console.error('Failed to write debug log:', err);
  }
}

async function fetchTranscriptViaPython(videoId: string): Promise<{ text: string; segments: TranscriptSegment[] } | null> {
  logDebug(`Attempting python transcript fetch for video ID: ${videoId}`);
  try {
    const scriptPath = path.resolve(process.cwd(), 'scripts/fetch-transcript.py');
    logDebug(`Python script path: ${scriptPath}`);
    
    const { stdout, stderr } = await execFilePromise('python3', [scriptPath, videoId]);
    if (stderr) {
      logDebug(`Python script stderr: ${stderr.trim()}`);
    }
    
    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) {
      logDebug(`Python transcript error returned: ${parsed.error}`);
      return null;
    }
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      const segments: TranscriptSegment[] = parsed.map((item: any) => ({
        start: item.start,
        end: item.start + item.duration,
        text: item.text,
      }));
      const text = segments.map(s => s.text).join(' ');
      logDebug(`Python transcript fetch successful: parsed ${segments.length} segments.`);
      return { text, segments };
    }
    
    logDebug(`Python transcript fetch returned empty or invalid response structure.`);
    return null;
  } catch (err: any) {
    logDebug(`Python transcript execution failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetches and parses auto-generated or manual captions directly from a YouTube video URL.
 * Queries YouTube's internal InnerTube player API using a TV client profile to bypass CAPTCHA/bot checks.
 */
export async function fetchYoutubeTranscript(videoUrl: string): Promise<{ text: string; segments: TranscriptSegment[] } | null> {
  logDebug(`fetchYoutubeTranscript started for: ${videoUrl}`);
  try {
    // Extract video ID
    const videoIdMatch = videoUrl.match(/(?:v=|\/embed\/|\/v\/|youtu\.be\/)([^#\&\?]+)/);
    if (!videoIdMatch) {
      logDebug(`Failed to extract video ID from URL: ${videoUrl}`);
      return null;
    }
    const videoId = videoIdMatch[1];
    logDebug(`Extracted Video ID: ${videoId}`);

    // Try Python transcript fetcher first
    const pythonResult = await fetchTranscriptViaPython(videoId);
    if (pythonResult) {
      return pythonResult;
    }

    logDebug(`Python transcript fetch failed/unavailable. Falling back to InnerTube player API fetch.`);

    // Fetch video details via the TVHTML5 client on YouTube's InnerTube API (bypasses CAPTCHA)
    const payload = {
      videoId: videoId,
      context: {
        client: {
          clientName: 'TVHTML5',
          clientVersion: '7.20230405.08.01',
          hl: 'en',
          gl: 'US',
          utcOffsetMinutes: 0
        },
      },
    };

    logDebug(`Fetching InnerTube player API for video: ${videoId}`);
    const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(payload),
      cache: 'no-store' // Disable Next.js caching
    });

    logDebug(`InnerTube API Response Status: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      logDebug(`InnerTube API response not OK. Code: ${response.status}`);
      return null;
    }

    const data: any = await response.json();
    logDebug(`InnerTube playabilityStatus: ${JSON.stringify(data.playabilityStatus)}`);

    if (data.playabilityStatus?.status !== 'OK') {
      logDebug(`YouTubei playabilityStatus is not OK: ${data.playabilityStatus?.status} (${data.playabilityStatus?.reason})`);
      return null;
    }

    const captionTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    logDebug(`Caption tracks object found: ${!!captionTracks}`);
    if (!captionTracks || captionTracks.length === 0) {
      logDebug(`No caption tracks returned from YouTubei API for video ${videoId}.`);
      return null;
    }

    logDebug(`Found ${captionTracks.length} caption tracks.`);

    // Select language (Prefer English, fall back to first track available)
    const englishTrack = captionTracks.find(
      (track: any) => track.languageCode === 'en' || track.languageCode.startsWith('en')
    );
    const selectedTrack = englishTrack || captionTracks[0];
    
    if (!selectedTrack || !selectedTrack.baseUrl) {
      logDebug(`Selected track is invalid or has no baseUrl.`);
      return null;
    }

    logDebug(`Selected track language: ${selectedTrack.languageCode}. URL: ${selectedTrack.baseUrl.substring(0, 100)}...`);

    // Fetch XML transcript
    logDebug(`Fetching XML transcript from baseUrl...`);
    const xmlResponse = await fetch(selectedTrack.baseUrl, { cache: 'no-store' });
    logDebug(`XML Response Status: ${xmlResponse.status} ${xmlResponse.statusText}`);
    if (!xmlResponse.ok) {
      logDebug(`XML fetch not OK. Code: ${xmlResponse.status}`);
      return null;
    }
    const xmlText = await xmlResponse.text();
    logDebug(`XML transcript content length: ${xmlText.length} bytes.`);

    // Parse XML tags: <text start="12.34" dur="5.67">Caption text</text>
    const segments: TranscriptSegment[] = [];
    const textTagRegExp = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
    
    let match;
    const fullTextParts: string[] = [];

    // Helper to decode basic XML / HTML entities
    const decodeHtml = (htmlText: string) => {
      return htmlText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/[\r\n]+/g, ' ');
    };

    while ((match = textTagRegExp.exec(xmlText)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = decodeHtml(match[3]?.trim() || '');
      
      if (text) {
        segments.push({
          start,
          end: start + duration,
          text,
        });
        fullTextParts.push(text);
      }
    }

    // Fallback regex in case attributes are in a different order or XML format varies
    if (segments.length === 0) {
      logDebug(`No segments parsed with main regex. Trying fallback regex...`);
      const textTagRegExpAlt = /<text\s+[^>]*start="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
      let altMatch;
      while ((altMatch = textTagRegExpAlt.exec(xmlText)) !== null) {
        const start = parseFloat(altMatch[1]);
        const text = decodeHtml(altMatch[2]?.trim() || '');
        if (text) {
          segments.push({
            start,
            end: start + 3.0, // fallback 3s duration
            text,
          });
          fullTextParts.push(text);
        }
      }
    }

    logDebug(`Segments parsed: ${segments.length}`);

    if (segments.length === 0) {
      logDebug(`Failed to parse any segments from XML content.`);
      return null;
    }

    logDebug(`fetchYoutubeTranscript completed successfully.`);
    return {
      text: fullTextParts.join(' '),
      segments,
    };
  } catch (error: any) {
    logDebug(`Error fetching YouTube transcript: ${error?.message || error}`);
    return null;
  }
}
