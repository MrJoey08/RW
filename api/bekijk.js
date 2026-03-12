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
    html, body { min-height:100%; background:#1a1a1a; }
    #bg {
      position: fixed;
      top:0; left:0; width:100%; height:100%;
      z-index: 0;
    }
    #status {
      position: relative; z-index: 2;
      color: rgba(232,224,216,0.5);
      font-family: sans-serif;
      font-size: 0.9rem;
      text-align: center;
      padding: 48px 24px;
    }
    #viewer { position: relative; z-index: 2; }
    canvas.page { display:block; width:100%!important; height:auto!important; }
  </style>
</head>
<body>
  <canvas id="bg"></canvas>
  <div id="status">Laden…</div>
  <div id="viewer"></div>

  <script>
  // WebGL achtergrond
  (function() {
    var canvas = document.getElementById('bg');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { canvas.style.background='#1a1a1a'; return; }

    var frag = [
      'precision mediump float;',
      'uniform float t;',
      'uniform vec2 res;',
      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / res;',
      '  float x = uv.x; float y = uv.y;',
      '  float w1 = sin(x*3.1+t*0.7 + sin(y*2.4+t*0.5)*1.2) * 0.5 + 0.5;',
      '  float w2 = sin(y*2.8-t*0.9 + sin(x*3.6-t*0.6)*1.1) * 0.5 + 0.5;',
      '  float w3 = sin((x+y)*2.5+t*0.8 + sin(x*1.8+t*0.4)*0.9) * 0.5 + 0.5;',
      '  float w4 = sin((x-y)*3.2-t*0.6 + sin(y*2.1-t*0.7)*1.0) * 0.5 + 0.5;',
      '  float blend = (w1*w2 + w2*w3 + w3*w4) / 3.0;',
      '  vec3 orange = vec3(0.910, 0.388, 0.290);',
      '  vec3 pink   = vec3(0.831, 0.353, 0.447);',
      '  vec3 dark   = vec3(0.102, 0.102, 0.102);',
      '  vec3 col = mix(dark, mix(orange, pink, w2), pow(blend, 1.4) * 0.85);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\\n');

    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, 'attribute vec2 p; void main(){gl_Position=vec4(p,0,1);}');
    gl.compileShader(vs);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, frag);
    gl.compileShader(fs);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog); gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog,'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

    var tL=gl.getUniformLocation(prog,'t'), rL=gl.getUniformLocation(prog,'res');
    var start=performance.now();

    function resize(){
      canvas.width=innerWidth; canvas.height=innerHeight;
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    resize();
    window.onresize=resize;

    (function tick(){
      gl.uniform1f(tL,(performance.now()-start)/1000);
      gl.uniform2f(rL,canvas.width,canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      requestAnimationFrame(tick);
    })();
  })();
  </script>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    pdfjsLib.getDocument({ url: '/api/proxy?map=${map}', disableStream: true })
      .promise.then(function(pdf) {
        document.getElementById('status').remove();
        var chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) {
          (function(n){ chain = chain.then(function(){
            return pdf.getPage(n).then(function(page){
              var vp = page.getViewport({ scale: window.devicePixelRatio * 2 });
              var c  = document.createElement('canvas');
              c.className = 'page';
              c.width = vp.width; c.height = vp.height;
              return page.render({ canvasContext: c.getContext('2d'), viewport: vp })
                .promise.then(function(){ document.getElementById('viewer').appendChild(c); });
            });
          }); })(i);
        }
        return chain;
      })
      .catch(function(e){
        document.getElementById('status').textContent = 'Fout: ' + e.message;
      });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
};
