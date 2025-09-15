export async function GET() {
  const enabled = process.env.GTAW_AUTH_ENABLED === 'true';
  if (!enabled) {
    return new Response(JSON.stringify({ enabled: false }), { status: 200 });
  }

  const clientId = process.env.GTAW_CLIENT_ID;
  const callbackUrl = process.env.GTAW_CALLBACK_URL;
  if (!clientId || !callbackUrl) {
    return new Response(JSON.stringify({ enabled: false }), { status: 200 });
  }

  const authUrl = `https://ucp.gta.world/oauth/authorize?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=`;
  return new Response(JSON.stringify({ enabled: true, url: authUrl }), { status: 200 });
}
