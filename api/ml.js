// api/ml.js — Proxy serverless para MercadoLibre
// Vercel ejecuta esto en el servidor, sin problemas de CORS

const ML_APP_ID     = '3657697217255500';
const ML_SECRET     = 'uKKiMkiy4EotNDuITH5RKCysOfUrT0MK';
const ML_SITE       = 'MLA'; // Argentina
const ML_BASE       = 'https://api.mercadolibre.com';

// Cache simple en memoria (dura mientras la función está viva)
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getAppToken() {
  const key = 'app_token';
  if (cache[key] && Date.now() < cache[key].exp) return cache[key].val;

  const res = await fetch(`${ML_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     ML_APP_ID,
      client_secret: ML_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  cache[key] = { val: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, q, id, limit = 20, offset = 0 } = req.query;

  try {
    const token = await getAppToken();
    const headers = { Authorization: `Bearer ${token}` };

    // ===== BUSCAR PRODUCTOS =====
    if (action === 'search') {
      if (!q) return res.status(400).json({ error: 'Parámetro q requerido' });

      const cacheKey = `search_${q}_${limit}_${offset}`;
      if (cache[cacheKey] && Date.now() < cache[cacheKey].exp) {
        return res.status(200).json(cache[cacheKey].val);
      }

      const url = `${ML_BASE}/sites/${ML_SITE}/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
      const mlRes = await fetch(url, { headers });
      if (!mlRes.ok) throw new Error(`ML search error: ${mlRes.status}`);
      const data = await mlRes.json();

      // Simplificar respuesta — solo lo que necesitamos
      const productos = (data.results || []).map(p => ({
        id:          p.id,
        titulo:      p.title,
        precio:      p.price,
        moneda:      p.currency_id,
        imagen:      p.thumbnail?.replace('http://', 'https://').replace('-I.jpg', '-O.jpg'),
        link:        p.permalink,
        condicion:   p.condition,
        vendidos:    p.sold_quantity,
        envio_gratis: p.shipping?.free_shipping,
        tienda:      p.official_store_name || null,
        categoria:   p.category_id,
      }));

      const resultado = {
        total:    data.paging?.total || 0,
        offset:   data.paging?.offset || 0,
        limit:    data.paging?.limit || 20,
        productos,
      };

      cache[cacheKey] = { val: resultado, exp: Date.now() + CACHE_TTL };
      return res.status(200).json(resultado);
    }

    // ===== DETALLE DE PRODUCTO =====
    if (action === 'detail') {
      if (!id) return res.status(400).json({ error: 'Parámetro id requerido' });

      const cacheKey = `detail_${id}`;
      if (cache[cacheKey] && Date.now() < cache[cacheKey].exp) {
        return res.status(200).json(cache[cacheKey].val);
      }

      const [itemRes, descRes] = await Promise.all([
        fetch(`${ML_BASE}/items/${id}`, { headers }),
        fetch(`${ML_BASE}/items/${id}/description`, { headers }),
      ]);

      if (!itemRes.ok) throw new Error(`ML detail error: ${itemRes.status}`);
      const item = await itemRes.json();
      const desc = descRes.ok ? await descRes.json() : {};

      const resultado = {
        id:          item.id,
        titulo:      item.title,
        precio:      item.price,
        moneda:      item.currency_id,
        imagenes:    (item.pictures || []).map(p => p.secure_url || p.url),
        imagen:      item.thumbnail?.replace('http://', 'https://').replace('-I.jpg', '-O.jpg'),
        link:        item.permalink,
        condicion:   item.condition,
        vendidos:    item.sold_quantity,
        stock:       item.available_quantity,
        envio_gratis: item.shipping?.free_shipping,
        descripcion: desc.plain_text || '',
        atributos:   (item.attributes || []).slice(0, 8).map(a => ({ nombre: a.name, valor: a.value_name })),
        peso:        item.shipping?.dimensions?.weight || null,
        dimensiones: item.shipping?.dimensions || null,
        tienda:      item.official_store_name || null,
        categoria:   item.category_id,
      };

      cache[cacheKey] = { val: resultado, exp: Date.now() + CACHE_TTL };
      return res.status(200).json(resultado);
    }

    // ===== CATEGORÍAS =====
    if (action === 'categories') {
      const cacheKey = 'categories';
      if (cache[cacheKey] && Date.now() < cache[cacheKey].exp) {
        return res.status(200).json(cache[cacheKey].val);
      }
      const catRes = await fetch(`${ML_BASE}/sites/${ML_SITE}/categories`, { headers });
      const cats = await catRes.json();
      cache[cacheKey] = { val: cats, exp: Date.now() + 60 * 60 * 1000 }; // 1 hora
      return res.status(200).json(cats);
    }

    return res.status(400).json({ error: 'Acción no válida. Usar: search, detail, categories' });

  } catch (err) {
    console.error('ML proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
