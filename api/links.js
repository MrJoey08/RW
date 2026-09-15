const https = require('https');

const ORIGIN = 'rw.acits.nl';

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

// Haalt eventueel protocol+domein en een beginnende "/" van een href af,
// zodat het niet uitmaakt of de link relatief, root-relatief of absoluut is.
function normaliseerPad(ruwPad) {
  return ruwPad.replace(/^https?:\/\/[^/]+\//i, '').replace(/^\//, '');
}

// Zoekt op de homepagina zelf naar het volledige pad van het bestand in de
// gegeven map ('vandaag' of 'morgen'). We gebruiken de homepagina i.p.v. een
// los mapoverzicht (bijv. /vandaag/), omdat die laatste op sommige hosts
// (zoals de huidige) geen directory listing teruggeeft.
async function vindBestand(map) {
  const { body } = await haalOp('/');
  const html = body.toString('utf8');
  const regex = new RegExp('href="([^"]*' + map + '/[^"]+\\.pdf)"', 'i');
  const m = html.match(regex);
  return m ? normaliseerPad(m[1]) : null;
}

// Zoekt op de homepagina naar het infobord-bestand. Dit kan een .pdf of een
// .pptx zijn — de school wisselt dit formaat weleens.
async function vindInfobord() {
  const { body } = await haalOp('/');
  const html = body.toString('utf8');
  const m = html.match(/href="([^"]*info\/[^"]+\.(?:pdf|pptx))"/i);
  return m ? normaliseerPad(m[1]) : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { map, bestand } = req.query;

  try {
    // ── PDF: ?map=vandaag of ?map=morgen ────────────────────────────
    if (map && ['vandaag', 'morgen'].includes(map)) {
      const pad = await vindBestand(map);
      if (!pad) return res.status(404).json({ error: `Geen PDF in /${map}/` });

      const upstream = await haalOp('/' + encodeURI(pad));
      if (upstream.status === 404) return res.status(404).json({ error: 'PDF niet gevonden' });

      const naam = pad.split('/').pop();

      // ETag gebaseerd op bestandsnaam + last-modified zodat browser
      // wijzigingen detecteert zonder de inhoud opnieuw te downloaden
      const lastMod = upstream.headers['last-modified'] || '';
      const etag    = `"${naam}-${lastMod}"`;

      // Controleer If-None-Match — stuur 304 als niets veranderd
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === etag) {
        return res.status(304).end();
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'no-cache'); // altijd revalideren
      if (upstream.headers['content-length'])
        res.setHeader('Content-Length', upstream.headers['content-length']);
      return res.status(200).end(upstream.body);
    }

    // ── Infobord: ?bestand=infobord ──────────────────────────────────
    if (bestand === 'infobord') {
      const pad = await vindInfobord();
      if (!pad) return res.status(404).json({ error: 'Infobord niet gevonden' });

      const naam = pad.split('/').pop();
      const upstream = await haalOp('/' + encodeURI(pad));
      if (upstream.status === 404) return res.status(404).json({ error: 'Infobord niet gevonden' });

      const ext = (naam.split('.').pop() || '').toLowerCase();
      const contentType = ext === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'attachment; filename="' + naam + '"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).end(upstream.body);
    }

    return res.status(400).json({ error: 'Gebruik ?map=vandaag, ?map=morgen, of ?bestand=infobord' });

  } catch (err) {
    console.error('Proxy fout:', err.message);
    return res.status(502).json({ error: 'Originele server niet bereikbaar', detail: err.message });
  }
};
