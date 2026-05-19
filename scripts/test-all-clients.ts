const videoId = 'q9wc7hUrW8U';
const innerTubeUrl = 'https://www.youtube.com/youtubei/v1/player';

const clients = [
  { name: 'WEB', version: '2.20230301.09.00' },
  { name: 'MWEB', version: '2.20230301.09.00' },
  { name: 'WEB_EMBEDDED_PLAYER', version: '1.20230301.09.00' },
  { name: 'ANDROID', version: '17.31.35' },
  { name: 'IOS', version: '17.33.2' },
  { name: 'TVHTML5', version: '7.20230405.08.01' },
  { name: 'ANDROID_TESTSUITE', version: '1.9' },
  { name: 'ANDROID_MUSIC', version: '5.46.4' }
];

async function testClient(clientName: string, clientVersion: string) {
  console.log(`Testing client: ${clientName}...`);
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
    const status = data.playabilityStatus?.status;
    const reason = data.playabilityStatus?.reason;
    const hasCaptions = !!data.captions;
    console.log(`  -> Status: ${status} | Reason: ${reason}`);
    console.log(`  -> Has Captions: ${hasCaptions}`);
    
    if (hasCaptions) {
      const tracks = data.captions.playerCaptionsTracklistRenderer?.captionTracks;
      console.log(`  -> Caption tracks count: ${tracks?.length || 0}`);
      if (tracks && tracks.length > 0) {
        console.log(`  -> Sample URL: ${tracks[0].baseUrl.substring(0, 80)}...`);
        return true;
      }
    }
  } catch (err: any) {
    console.error(`  -> Error:`, err.message);
  }
  return false;
}

async function main() {
  for (const client of clients) {
    await testClient(client.name, client.version);
    console.log('---------------------------------------------');
  }
}

main();
