// Ziyaretçi sayacı — tarayıcıdan doğrudan hits.dwyl.com'a fetch CORS'a takılıyor
// (servis Access-Control-Allow-Origin göndermiyor; <img> badge için tasarlanmış).
// Bu fonksiyon sunucu tarafında arabulucu: CORS sorunu yok, kendi /api/visits
// adresimizden JSON döndürüyoruz.
export default async function handler(req, res) {
  try {
    const r = await fetch('https://hits.dwyl.com/safhobi-com/ziyaretci-sayaci.json', {
      cache: 'no-store',
    });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const data = await r.json();
    const count = parseInt(data.message, 10);
    if (!Number.isFinite(count)) throw new Error('geçersiz sayı');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ count });
  } catch (e) {
    res.status(502).json({ error: 'count unavailable' });
  }
}
