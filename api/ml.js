const RAPID_KEY  = '04e288c6e6mshcc1dc56eb2ee75ap10a517jsn79c314d71bf5';
const RAPID_HOST = 'mercado-libre7.p.rapidapi.com';
const RAPID_BASE = 'https://mercado-libre7.p.rapidapi.com';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action = 'search', q = '', id = '', site_id = 'MLA', limit = 20, offset = 0 } = req.query;

  const headers = {
    'x-rapidapi-key':  RAPID_KEY,
    'x-rapidapi-host': RAPID_HOST
  };

  try {
    if (action === 'ping') {
      const r = await fetch(`${RAPID_BASE}/listings_for_search?query=taladro&site_id=MLA`, { headers });
      const d = await r.json();
      return res.json({ ok: r.ok, status: r.status, total: d.search_results, items: d.data?.length || 0 });
    }

    if (action === 'search') {
      if (!q) return res.status(400).json({ error: 'q requerido' });
      const r = await fetch(`${RAPID_BASE}/listings_for_search?query=${encodeURIComponent(q)}&site_id=${site_id}&offset=${offset}`, { headers });
      if (!r.ok) return res.status(r.status).json({ error: `RapidAPI error ${r.status}` });
      const d = await r.json();
      return res.json({
        total: parseInt((d.search_results || '0').replace(/\D/g, '')) || 0,
        offset: parseInt(offset),
        productos: (d.data || []).map(p => ({
          id:           p.id,
          titulo:       p.title,
          precio:       parseFloat((p.price || '0').replace(/\./g, '').replace(',', '.')),
          moneda:       'ARS',
          imagen:       null,
          link:         p.url,
          condicion:    'new',
          vendidos:     null,
          envio_gratis: p.shipping && p.shipping.toLowerCase().includes('gratis'),
          vendedor:     p.seller || null,
          precio_tachado: p.strikethrough_price || null,
          fuente:       'ml'
        }))
      });
    }

    if (action === 'detail') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      const url = `https://www.mercadolibre.com.ar/p/${id}`;
      const r = await fetch(`${RAPID_BASE}/listing_data?listing_url=${encodeURIComponent(url)}`, { headers });
      const d = await r.json();
      return res.json(d);
    }

    return res.status(400).json({ error: 'action invalida: search | detail | ping' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
