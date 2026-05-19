import sys
import os
import json
import yt_dlp

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Video ID and output path arguments are required"}))
        sys.exit(1)
        
    video_id = sys.argv[1]
    output_path = sys.argv[2] # expected to be an absolute path ending in .mp3
    
    # yt-dlp expects the base template path without the extension if we are postprocessing,
    # or we can specify the options directly
    out_dir = os.path.dirname(output_path)
    out_filename = os.path.basename(output_path)
    
    # Remove file extension because yt-dlp adds its own during extraction
    base_name, _ = os.path.splitext(out_filename)
    template = os.path.join(out_dir, base_name)
    
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': template + '.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }
    
    try:
        print(f"Downloading YouTube audio for video ID: {video_id}...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        # The expected output path should now exist
        expected_output = template + '.mp3'
        if os.path.exists(expected_output):
            # If the user specified a different location or case, rename it if necessary
            if expected_output != output_path:
                os.rename(expected_output, output_path)
            print(json.dumps({"success": True, "output_path": output_path}))
            sys.exit(0)
        else:
            print(json.dumps({"error": "Failed to verify downloaded audio file"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
