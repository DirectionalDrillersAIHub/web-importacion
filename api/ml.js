const ML_BASE = 'https://api.mercadolibre.com';
const ML_SITE = 'MLA';
const ML_APP_ID = '3657697217255500';
const ML_SECRET = 'uKKiMkiy4EotNDuITH5RKCysOfUrT0MK';

let tokenCache = null;
let tokenExp   = 0;

async function getToken() {
  async function getToken() {
  return 'APP_USR-3657697217255500-041311-39e681d3a423bc0a9f453f02028a17cc-95829937';
}
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${ML_APP_ID}&client_secret=${ML_SECRET}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token fallido: ${JSON.stringify(data)}`);
  tokenCache = data.access_token;
  tokenExp   = Date.now() + (data.expires_in - 60) * 1000;
  return tokenCache;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action = 'search', q = '', id = '', limit = 20, offset = 0 } = req.query;

  try {
    // Búsqueda SIN token — API pública de ML
    if (action === 'search') {
      if (!q) return res.status(400).json({ error: 'q requerido' });
      const url = `${ML_BASE}/sites/${ML_SITE}/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: d });
      return res.json({
        total: d.paging?.total || 0,
        offset: d.paging?.offset || 0,
        productos: (d.results || []).map(p => ({
          id:           p.id,
          titulo:       p.title,
          precio:       p.price,
          moneda:       p.currency_id,
          imagen:       (p.thumbnail || '').replace('http://', 'https://').replace('-I.jpg', '-O.jpg'),
          link:         p.permalink,
          condicion:    p.condition,
          vendidos:     p.sold_quantity,
          envio_gratis: p.shipping?.free_shipping,
          fuente:       'ml'
        }))
      });
    }

    // Detalle CON token (necesario para datos completos)
    if (action === 'detail') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      // Intentar sin token primero
      const ir = await fetch(`${ML_BASE}/items/${id}`);
      const item = await ir.json();
      if (!ir.ok) return res.status(ir.status).json({ error: item });

      // Descripción sin token
      const dr = await fetch(`${ML_BASE}/items/${id}/description`);
      const desc = dr.ok ? await dr.json() : {};

      return res.json({
        id:           item.id,
        titulo:       item.title,
        precio:       item.price,
        moneda:       item.currency_id,
        imagenes:     (item.pictures || []).map(p => p.secure_url),
        imagen:       (item.thumbnail || '').replace('http://', 'https://').replace('-I.jpg', '-O.jpg'),
        link:         item.permalink,
        condicion:    item.condition,
        vendidos:     item.sold_quantity,
        stock:        item.available_quantity,
        envio_gratis: item.shipping?.free_shipping,
        descripcion:  desc.plain_text || '',
        atributos:    (item.attributes || []).slice(0, 8).map(a => ({ nombre: a.name, valor: a.value_name })),
        fuente:       'ml'
      });
    }

    if (action === 'ping') {
      // Test rápido sin token
      const r = await fetch(`${ML_BASE}/sites/${ML_SITE}/search?q=taladro&limit=1`);
      const d = await r.json();
      return res.json({
        ok: r.ok,
        status: r.status,
        total: d.paging?.total || 0,
        primer_resultado: d.results?.[0]?.title || null
      });
    }

    if (action === 'debug') {
      const r = await fetch(`${ML_BASE}/sites/${ML_SITE}/search?q=taladro&limit=2`);
      const text = await r.text();
      return res.json({ status: r.status, response: text.substring(0, 800) });
    }

    return res.status(400).json({ error: 'action invalida: search | detail | ping | debug' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
