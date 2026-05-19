async function main() {
  const videoId = 'q9wc7hUrW8U';
  const url = `https://youtubetranscript.com/?server_vid2=${videoId}`;
  
  console.log(`Fetching from youtubetranscript.com: ${url}...`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const text = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Length: ${text.length} bytes`);
    
    // Check if it returned XML containing <text> tags
    const containsTextTags = text.includes('<text');
    console.log(`Contains <text> tags: ${containsTextTags}`);
    
    if (text.length < 500) {
      console.log('Response content:', text);
    } else {
      console.log('Sample content:', text.substring(0, 300) + '...');
    }
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

main();
