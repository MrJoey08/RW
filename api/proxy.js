const https = require('https');

const ORIGIN = 'rw.altenacollege.nl';

function haalOp(path) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: ORIGIN,
        path: path,
        rejectUnauthorized: false,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      },
      (res) => {
        const parts = [];
        res.on('data', (c) => parts.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts) }));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function haalLinks() {
  const { body } = await haalOp('/');
  const html = body.toString('utf8');
  const regex = /href="([^"]+\.(pdf|pptx))"/gi;
  const links = {};
  let m;
  while ((m = regex.exec(html)) !== null) {
    const pad = m[1];
    if (pad.startsWith('vandaag/')) links.vandaag = pad;
    else if (pad.startsWith('morgen/')) links.morgen = pad;
    else if (pad.startsWith('info/'))   links.infobord = pad;
  }
  return links;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { map, bestand } = req.query;

  try {
    const links = await haalLinks();

    if (map && ['vandaag', 'morgen'].includes(map)) {
      const pad = links[map];
      if (!pad) return res.status(404).json({ error: `Geen PDF gevonden voor ${map}` });

      const upstream = await haalOp('/' + encodeURI(pad));
      if (upstream.status === 404) return res.status(404).json({ error: 'PDF niet gevonden' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-store');

      return res.status(200).end(upstream.body);
    }

    if (bestand === 'infobord') {
      const pad = links.infobord;
      if (!pad) return res.status(404).json({ error: 'Infobord niet gevonden' });

      const upstream = await haalOp('/' + encodeURI(pad));
      const naam = pad.split('/').pop();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${naam}"`);
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=60');
      return res.status(200).end(upstream.body);
    }

    return res.status(400).json({ error: 'Gebruik ?map=vandaag, ?map=morgen, of ?bestand=infobord' });

  } catch (err) {
    console.error('Proxy fout:', err.message);
    return res.status(502).json({ error: 'Originele server niet bereikbaar', detail: err.message });
  }
};
