async function testClient(clientName: string, clientVersion: string) {
  const videoId = 'q9wc7hUrW8U';
  const innerTubeUrl = 'https://www.youtube.com/youtubei/v1/player';

  console.log(`\nTesting client: ${clientName}...`);

  try {
    const response = await fetch(innerTubeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        videoId: videoId,
        context: {
          client: {
            clientName: clientName,
            clientVersion: clientVersion,
            hl: 'en',
            gl: 'US',
            utcOffsetMinutes: 0
          },
        },
      }),
    });

    const data: any = await response.json();
    const playabilityStatus = data.playabilityStatus?.status;
    const hasCaptions = !!data.captions;
    console.log(`  -> Playability status: ${playabilityStatus}`);
    console.log(`  -> Contains captions object? ${hasCaptions}`);

    if (hasCaptions) {
      const captionTracks = data.captions.playerCaptionsTracklistRenderer?.captionTracks;
      console.log(`  -> Caption tracks found: ${!!captionTracks}`);
      if (captionTracks) {
        console.log(`  -> SUCCESS! Found ${captionTracks.length} track(s).`);
        captionTracks.forEach((track: any) => {
          console.log(`     - [${track.languageCode}] ${track.baseUrl.substring(0, 100)}...`);
        });
        return true;
      }
    } else {
      if (data.playabilityStatus?.reason) {
        console.log(`  -> Playability reason: ${data.playabilityStatus.reason}`);
      }
    }
  } catch (err: any) {
    console.error(`  -> Fetch error for ${clientName}:`, err.message);
  }
  return false;
}

async function main() {
  const androidOk = await testClient('ANDROID', '17.31.35');
  const iosOk = await testClient('IOS', '17.33.2');
  const tvOk = await testClient('TVHTML5', '7.20230405.08.01');
  const webOk = await testClient('WEB', '2.20230301.09.00');
}

main();
