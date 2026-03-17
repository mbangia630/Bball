// ═══════════════════════════════════════════════════════
// MANUAL REFRESH API ROUTE (Next.js App Router)
// Hit this endpoint to trigger an immediate data refresh
//
// 3 ways to use it:
//   1. Button in your app (see below)
//   2. Browser bookmark: https://your-app.vercel.app/api/refresh?key=YOUR_SECRET
//   3. Phone shortcut: iOS Shortcuts / Android Tasker → GET request to that URL
// ═══════════════════════════════════════════════════════

export async function GET(request) {
  // Simple auth — check for your secret key
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== process.env.REFRESH_SECRET) {
    return Response.json({ error: 'Invalid key' }, { status: 401 });
  }

  try {
    // Trigger the GitHub Actions workflow via API
    const res = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_PAT}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'manual-refresh',
          client_payload: {
            triggered_by: 'api',
            timestamp: new Date().toISOString(),
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: 'GitHub API failed', detail: err }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Refresh triggered! Data will update in ~60 seconds.',
      triggered_at: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }