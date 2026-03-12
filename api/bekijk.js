// Toont de PDF via Google Docs Viewer — Android ziet HTML, geen PDF
module.exports = async (req, res) => {
  const { map } = req.query;
  if (!map || !['vandaag', 'morgen'].includes(map)) {
    return res.status(400).send('Ongeldig');
  }

  // De publieke URL van de proxy — Google Docs Viewer haalt dit op
  const pdfUrl = encodeURIComponent(`https://rw-ac.vercel.app/api/proxy?map=${map}`);
  const viewerUrl = `https://docs.google.com/viewer?url=${pdfUrl}&embedded=true`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roosterwijziging</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { height:100%; background:#1a1a1a; }
    iframe { display:block; width:100%; height:100vh; border:none; }
  </style>
</head>
<body>
  <iframe src="${viewerUrl}" allowfullscreen></iframe>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
