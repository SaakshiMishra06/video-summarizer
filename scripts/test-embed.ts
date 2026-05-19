async function main() {
  const videoId = 'q9wc7hUrW8U';
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
  console.log(`Fetching embed URL: ${embedUrl}`);
  try {
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`HTML Length: ${html.length} bytes`);
    
    // Check if player configuration contains caption tracks
    const hasPlayerConfig = html.includes('ytInitialPlayerResponse') || html.includes('ytInitialData');
    console.log(`Has player config or initial data: ${hasPlayerConfig}`);
    
    // Write embed HTML to a local file in scripts/embed-dump.html to inspect it
    const fs = require('fs');
    fs.writeFileSync('scripts/embed-dump.html', html);
    console.log(`Saved HTML to scripts/embed-dump.html`);
    
    // Look for captionTracks or timedtext or caption in html
    const matches = html.match(/"captionTracks"\s*:\s*\[[^\]]+\]/g);
    console.log(`Found captionTracks match in HTML:`, matches ? matches.length : 0);
    if (matches) {
      console.log('Matches:', matches);
    }
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

main();
