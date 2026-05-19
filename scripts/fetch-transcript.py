import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video ID argument is required"}))
        sys.exit(1)
        
    video_id = sys.argv[1]
    
    try:
        api = YouTubeTranscriptApi()
        # Fetch transcript
        fetched = api.fetch(video_id)
        
        # Format the output into a list of dicts with text, start, and duration
        data = []
        # In newer versions, fetched has `.snippets` which contains FetchedTranscriptSnippet
        if hasattr(fetched, 'snippets'):
            for snippet in fetched.snippets:
                data.append({
                    "text": snippet.text,
                    "start": snippet.start,
                    "duration": snippet.duration
                })
        else:
            # Fallback if it's already a list/dict in some versions
            for entry in fetched:
                data.append({
                    "text": entry.get("text", ""),
                    "start": entry.get("start", 0),
                    "duration": entry.get("duration", 0)
                })
                
        print(json.dumps(data))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
