export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'search';
  const q = searchParams.get('q') || '';
  const site_id = searchParams.get('site_id') || 'MLA';
  const offset = searchParams.get('offset') || '0';

  const headers = {
    'x-rapidapi-key': '04e288c6e6mshcc1dc56eb2ee75ap10a517jsn79c314d71bf5',
    'x-rapidapi-host': 'mercado-libre7.p.rapidapi.com'
  };

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    if (action === 'ping') {
      const r = await fetch('https://mercado-libre7.p.rapidapi.com/listings_for_search?search_str=taladro&site_id=MLA', { headers });
      const d = await r.json();
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, items: d.data?.length || 0, raw: d }), { headers: cors });
    }

    if (action === 'search') {
      if (!q) return new Response(JSON.stringify({ error: 'q requerido' }), { status: 400, headers: cors });
      const url = `https://mercado-libre7.p.rapidapi.com/listings_for_search?search_str=${encodeURIComponent(q)}&site_id=${site_id}&offset=${offset}`;
      const r = await fetch(url, { headers });
      const d = await r.json();
      const productos = (d.data || []).map(p => ({
        id: p.id,
        titulo: p.title,
        precio: parseFloat((p.price || '0').replace(/\./g, '')),
        moneda: 'ARS',
        imagen: null,
        link: p.url,
        envio_gratis: p.shipping && p.shipping.includes('gratis'),
        vendedor: p.seller || null,
        precio_tachado: p.strikethrough_price || null,
        fuente: 'ml'
      }));
      return new Response(JSON.stringify({
        total: parseInt((d.search_results || '0').replace(/\D/g, '')),
        productos
      }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'action invalida' }), { status: 400, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
