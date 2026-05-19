/**
 * Utility functions for VidBrief AI.
 */

/**
 * Combines Tailwind CSS class names conditionally.
 */
export function cn(...inputs: (string | boolean | undefined | null | {[key: string]: boolean})[]): string {
  const classes: string[] = [];

  inputs.forEach((input) => {
    if (!input) return;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object') {
      Object.entries(input).forEach(([key, value]) => {
        if (value) {
          classes.push(key);
        }
      });
    }
  });

  return classes.join(' ');
}

/**
 * Formats a duration in seconds to MM:SS or HH:MM:SS format.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedMins = mins.toString().padStart(2, '0');
  const formattedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const formattedHrs = hrs.toString().padStart(2, '0');
    return `${formattedHrs}:${formattedMins}:${formattedSecs}`;
  }

  return `${formattedMins}:${formattedSecs}`;
}

/**
 * Parses a timestamp string (like "01:23" or "01:02:03") to seconds.
 */
export function parseTimestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;

  const parts = timestamp.split(':').map(Number);
  
  if (parts.some(isNaN)) return 0;

  if (parts.length === 2) {
    // MM:SS
    const [mins, secs] = parts;
    return mins * 60 + secs;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const [hrs, mins, secs] = parts;
    return hrs * 3600 + mins * 60 + secs;
  }

  return 0;
}

/**
 * Formats a size in bytes to a human-readable string (e.g. KB, MB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats an ISO date string to a clean human-readable date.
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
