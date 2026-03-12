module.exports = async (req, res) => {
  const { map } = req.query;
  if (!map || !['vandaag', 'morgen'].includes(map)) {
    return res.status(400).send('Ongeldig');
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>Roosterwijziging</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      min-height: 100%;
      background:
        radial-gradient(ellipse at 20% 60%, rgba(232,99,74,0.13) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 30%, rgba(212,90,114,0.10) 0%, transparent 55%),
        #1a1a1a;
    }
    #status {
      color: #6b6560;
      font-family: sans-serif;
      font-size: 0.9rem;
      text-align: center;
      padding: 48px 24px;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: auto !important;
      margin: 0;
    }
  </style>
</head>
<body>
  <div id="status">Laden…</div>
  <div id="viewer"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    pdfjsLib.getDocument({ url: '/api/proxy?map=${map}', disableStream: true })
      .promise
      .then(function(pdf) {
        document.getElementById('status').style.display = 'none';
        var chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) {
          (function(pageNum) {
            chain = chain.then(function() {
              return pdf.getPage(pageNum).then(function(page) {
                var scale    = window.devicePixelRatio * 2;
                var viewport = page.getViewport({ scale: scale });
                var canvas   = document.createElement('canvas');
                canvas.width  = viewport.width;
                canvas.height = viewport.height;
                return page.render({
                  canvasContext: canvas.getContext('2d'),
                  viewport: viewport
                }).promise.then(function() {
                  document.getElementById('viewer').appendChild(canvas);
                });
              });
            });
          })(i);
        }
        return chain;
      })
      .catch(function(err) {
        document.getElementById('status').textContent = 'Fout: ' + err.message;
      });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
