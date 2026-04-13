export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const action  = searchParams.get('action') || 'search';
  const q       = searchParams.get('q') || '';
  const offset  = searchParams.get('offset') || '0';
  const country = 'ar';
  const sort_by = 'relevance';

  const headers = {
    'x-rapidapi-key':  '04e288c6e6mshcc1dc56eb2ee75ap10a517jsn79c314d71bf5',
    'x-rapidapi-host': 'mercado-libre7.p.rapidapi.com'
  };

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    if (action === 'ping') {
      const r = await fetch(
        `https://mercado-libre7.p.rapidapi.com/listings_for_search?search_str=taladro&country=${country}&sort_by=${sort_by}`,
        { headers }
      );
      const d = await r.json();
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, items: d.data?.length || 0 }), { headers: cors });
    }

    if (action === 'search') {
      if (!q) return new Response(JSON.stringify({ error: 'q requerido' }), { status: 400, headers: cors });
      const url = `https://mercado-libre7.p.rapidapi.com/listings_for_search?search_str=${encodeURIComponent(q)}&country=${country}&sort_by=${sort_by}&offset=${offset}`;
      const r = await fetch(url, { headers });
      const d = await r.json();
      const productos = (d.data || []).map(p => ({
        id:             p.id,
        titulo:         p.title,
        precio:         parseFloat((p.price || '0').replace(/\./g, '').replace(',', '.')),
        moneda:         'ARS',
        imagen:         null,
        link:           p.url,
        envio_gratis:   p.shipping && p.shipping.toLowerCase().includes('gratis'),
        vendedor:       p.seller || null,
        precio_tachado: p.strikethrough_price || null,
        fuente:         'ml'
      }));
      return new Response(JSON.stringify({
        total:    parseInt((d.search_results || '0').replace(/\D/g, '')) || 0,
        productos
      }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'action invalida' }), { status: 400, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
