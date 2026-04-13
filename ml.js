const ML_APP_ID = '3657697217255500';
const ML_SECRET = 'uKKiMkiy4EotNDuITH5RKCysOfUrT0MK';
const ML_SITE   = 'MLA';
const ML_BASE   = 'https://api.mercadolibre.com';

let tokenCache = null;
let tokenExp   = 0;

async function getToken() {
  if (tokenCache && Date.now() < tokenExp) return tokenCache;
  const res = await fetch(`${ML_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${ML_APP_ID}&client_secret=${ML_SECRET}`
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token error ${res.status}: ${err}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error(`No token: ${JSON.stringify(data)}`);
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
    const token = await getToken();
    const h = { Authorization: `Bearer ${token}` };

    if (action === 'ping') {
      return res.json({ ok: true, token: token ? 'generado' : 'fallo', app_id: ML_APP_ID });
    }

    if (action === 'search') {
      if (!q) return res.status(400).json({ error: 'q requerido' });
      const url = `${ML_BASE}/sites/${ML_SITE}/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
      const r = await fetch(url, { headers: h });
      const text = await r.text();
      if (!r.ok) return res.status(r.status).json({ error: `ML error ${r.status}`, detail: text });
      const d = JSON.parse(text);
      return res.json({
        total: d.paging?.total || 0,
        offset: d.paging?.offset || 0,
        limit: d.paging?.limit || 20,
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

    if (action === 'detail') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      const [ir, dr] = await Promise.all([
        fetch(`${ML_BASE}/items/${id}`, { headers: h }),
        fetch(`${ML_BASE}/items/${id}/description`, { headers: h })
      ]);
      const item = await ir.json();
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
        peso:         item.shipping?.dimensions?.weight || null,
        fuente:       'ml'
      });
    }

    return res.status(400).json({ error: 'action invalida: search | detail | ping' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
