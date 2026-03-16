export default {
  async fetch(request) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-quiver-key'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/api/congresstrading') {
      const key = request.headers.get('x-quiver-key');
      const ticker = (url.searchParams.get('ticker') || '').toUpperCase();
      if (!key) return new Response(JSON.stringify({ error: 'missing_key' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });

      const upstream = new URL('https://api.quiverquant.com/beta/live/congresstrading');
      if (ticker) upstream.searchParams.set('ticker', ticker);

      const r = await fetch(upstream.toString(), {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${key}`
        }
      });
      const body = await r.text();
      return new Response(body, { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, service: 'quantpulse-proxy' }), { headers: { ...cors, 'content-type': 'application/json' } });
  }
};
