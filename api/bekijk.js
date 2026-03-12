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
      background: #1a1a1a;
      min-height: 100%;
    }
    #laad {
      color: #6b6560;
      font-family: sans-serif;
      font-size: 0.9rem;
      text-align: center;
      padding: 48px 24px;
    }
    canvas {
      display: block;
      width: 100%;
      height: auto;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div id="laad">Laden…</div>
  <div id="viewer"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    async function laadPdf() {
      const loadingTask = pdfjsLib.getDocument('/api/proxy?map=${map}');
      const pdf = await loadingTask.promise;

      document.getElementById('laad').remove();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
        const schaal  = window.devicePixelRatio * (window.innerWidth / page.getViewport({ scale: 1 }).width);
        const viewport = page.getViewport({ scale: schaal });

        const canvas  = document.createElement('canvas');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport
        }).promise;

        document.getElementById('viewer').appendChild(canvas);
      }
    }

    laadPdf().catch(function(e) {
      document.getElementById('laad').textContent = 'Kon PDF niet laden: ' + e.message;
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
