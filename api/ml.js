const ML_BASE = 'https://api.mercadolibre.com';
const ML_SITE = 'MLA';

async function getToken() {
  return 'APP_USR-3657697217255500-041311-39e681d3a423bc0a9f453f02028a17cc-95829937';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, q, id, limit = 20, offset = 0 } = req.query;

  try {
    const token = await getToken();
    const h = { Authorization: 'Bearer ' + token };

    if (action === 'ping') {
      const r = await fetch(ML_BASE + '/sites/' + ML_SITE + '/search?q=taladro&limit=1', { headers: h });
      const d = await r.json();
      return res.json({ ok: r.ok, status: r.status, total: d.paging?.total || 0, primer: d.results?.[0]?.title || null });
    }

    if (action === 'search') {
      if (!q) return res.status(400).json({ error: 'q requerido' });
      const r = await fetch(ML_BASE + '/sites/' + ML_SITE + '/search?q=' + encodeURIComponent(q) + '&limit=' + limit + '&offset=' + offset, { headers: h });
      const d = await r.json();
      return res.json({
        total: d.paging?.total || 0,
        offset: d.paging?.offset || 0,
        productos: (d.results || []).map(function(p) { return {
          id: p.id, titulo: p.title, precio: p.price, moneda: p.currency_id,
          imagen: (p.thumbnail || '').replace('http://', 'https://').replace('-I.jpg', '-O.jpg'),
          link: p.permalink, condicion: p.condition, vendidos: p.sold_quantity,
          envio_gratis: p.shipping?.free_shipping, fuente: 'ml'
        }; })
      });
    }

    if (action === 'detail') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      const ir = await fetch(ML_BASE + '/items/' + id, { headers: h });
      const item = await ir.json();
      const dr = await fetch(ML_BASE + '/items/' + id + '/description', { headers: h });
      const desc = dr.ok ? await dr.json() : {};
      return res.json({
        id: item.id, titulo: item.title, precio: item.price, moneda: item.currency_id,
        imagenes: (item.pictures || []).map(function(p) { return p.secure_url; }),
        imagen: (item.thumbnail || '').replace('http://', 'https://').replace('-I.jpg', '-O.jpg'),
        link: item.permalink, condicion: item.condition, vendidos: item.sold_quantity,
        stock: item.available_quantity, envio_gratis: item.shipping?.free_shipping,
        descripcion: desc.plain_text || '',
        atributos: (item.attributes || []).slice(0, 8).map(function(a) { return { nombre: a.name, valor: a.value_name }; }),
        fuente: 'ml'
      });
    }

    return res.status(400).json({ error: 'action invalida' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};