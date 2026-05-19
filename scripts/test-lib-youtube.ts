import { fetchYoutubeTranscript } from '../lib/youtube';

async function main() {
  const videoUrl = 'https://www.youtube.com/watch?v=q9wc7hUrW8U';
  console.log(`Testing fetchYoutubeTranscript function directly for: ${videoUrl}`);
  
  const result = await fetchYoutubeTranscript(videoUrl);
  
  if (result) {
    console.log('\n🎉 SUCCESS!');
    console.log(`Text length: ${result.text.length} chars.`);
    console.log(`Segments: ${result.segments.length}`);
    console.log(`Sample: ${result.text.substring(0, 100)}...`);
  } else {
    console.log('\n❌ FAILED. fetchYoutubeTranscript returned null.');
  }
}

main();
