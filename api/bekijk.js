// Stuurt een HTML pagina die de PDF toont via een <embed>
// Werkt op mobiel zonder blob-popup
module.exports = async (req, res) => {
  const { map } = req.query;
  if (!map || !['vandaag', 'morgen'].includes(map)) {
    return res.status(400).send('Ongeldig');
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roosterwijziging</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { height:100%; background:#1a1a1a; }
    embed, iframe {
      display:block;
      width:100%;
      height:100vh;
      border:none;
    }
  </style>
</head>
<body>
  <embed src="/api/proxy?map=${map}" type="application/pdf">
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
