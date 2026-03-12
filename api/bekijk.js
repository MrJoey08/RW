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

    @keyframes glow1 {
      0%,100% { transform: translate(0%, 0%); }
      50%      { transform: translate(-60%, -70%); }
    }
    @keyframes glow2 {
      0%,100% { transform: translate(0%, 0%); }
      50%      { transform: translate(55%, 65%); }
    }
    @keyframes glow3 {
      0%,100% { transform: translate(0%, 0%); }
      50%      { transform: translate(-30%, 40%); }
    }

    html, body {
      min-height: 100%;
      background: #1a1a1a;
      position: relative;
      overflow-x: hidden;
    }

    .g1, .g2, .g3 {
      position: fixed;
      border-radius: 50%;
      filter: blur(72px);
      pointer-events: none;
      z-index: 0;
    }
    .g1 {
      width: 80vw; height: 60vw;
      background: rgba(232,99,74,0.28);
      bottom: -10%; right: -10%;
      animation: glow1 7s ease-in-out infinite;
    }
    .g2 {
      width: 70vw; height: 55vw;
      background: rgba(212,90,114,0.22);
      top: -10%; left: -10%;
      animation: glow2 8s ease-in-out infinite;
    }
    .g3 {
      width: 50vw; height: 40vw;
      background: rgba(232,99,74,0.14);
      top: 30%; left: 20%;
      animation: glow3 9s ease-in-out infinite;
    }

    #status {
      position: relative;
      z-index: 1;
      color: #6b6560;
      font-family: sans-serif;
      font-size: 0.9rem;
      text-align: center;
      padding: 48px 24px;
    }

    #viewer {
      position: relative;
      z-index: 1;
    }

    canvas {
      display: block;
      width: 100% !important;
      height: auto !important;
    }
  </style>
</head>
<body>
  <div class="g1"></div>
  <div class="g2"></div>
  <div class="g3"></div>
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
