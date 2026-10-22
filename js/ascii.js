/* ═══════════════════════════════════════════════════════════════
   ASCII — a spinning Bitcoin rendered entirely in text characters,
   plus a faint binary rain. No images, no unicode ₿ glyph: the
   coin is a sampled sprite rotated in 3D and mapped onto a
   character ramp each frame.
   ═══════════════════════════════════════════════════════════════ */
window.AsciiCoin = (function () {
  'use strict';

  var RAMP = ' .\u00B7:;=+*x#%@';

  function init(canvas, reduced) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var SPR = 76;

    /* build + sample the coin sprite */
    var sp = document.createElement('canvas');
    sp.width = SPR; sp.height = SPR;
    var sc = sp.getContext('2d', { willReadFrequently: true });
    sc.fillStyle = '#fff';
    sc.beginPath(); sc.arc(SPR / 2, SPR / 2, SPR * 0.46, 0, 6.2832); sc.fill();
    sc.strokeStyle = '#000';
    sc.lineWidth = SPR * 0.045;
    sc.beginPath(); sc.arc(SPR / 2, SPR / 2, SPR * 0.385, 0, 6.2832); sc.stroke();
    sc.save();
    sc.translate(SPR / 2, SPR / 2);
    sc.rotate(-0.22);
    sc.fillStyle = '#000';
    sc.font = '900 ' + (SPR * 0.62) + 'px Arial, sans-serif';
    sc.textAlign = 'center';
    sc.textBaseline = 'middle';
    sc.fillText('B', 0, SPR * 0.03);
    sc.fillRect(SPR * 0.068, -SPR * 0.40, SPR * 0.05, SPR * 0.16);
    sc.fillRect(SPR * 0.068, SPR * 0.245, SPR * 0.05, SPR * 0.16);
    sc.restore();

    var data = sc.getImageData(0, 0, SPR, SPR).data;
    var lum = new Float32Array(SPR * SPR);
    for (var i = 0; i < SPR * SPR; i++) {
      lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    }

    var a = 0.6, vel = 0.016, tilt = -0.32, tiltT = -0.32;
    var cols = 0, rows = 0, cw = 9, chh = 17;
    var raf = null, running = false, lastT = 0;
    var dragging = false, lx = 0, ly = 0;

    if (reduced) vel = 0.004;

    function resize() {
      var r = canvas.getBoundingClientRect();
      if (r.width < 8) return;
      canvas.width = Math.round(r.width);
      canvas.height = Math.round(r.height);
      var small = canvas.width < 460;
      ctx.font = (small ? '13px' : '15px') + ' "IBM Plex Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';
      cw = ctx.measureText('0').width || 9;
      chh = small ? 15 : 17;
      cols = Math.max(8, Math.floor(canvas.width / cw));
      rows = Math.max(8, Math.floor(canvas.height / chh));
      ctx.fillStyle = '#0E0C09';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawScene() {
      ctx.fillStyle = 'rgba(14,12,9,0.30)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      var f = 1.62, dd = 2.4;
      var ca = Math.cos(a), sa = Math.sin(a);
      var ct = Math.cos(tilt), st = Math.sin(tilt);
      var Lx = -0.35, Ly = -0.5, Lz = 0.79;
      var v, u, px0, py0, L, x1, z1, y1, z2, zz, gx, gy, nx, ny, nz, sh, bri, ci;

      for (v = 0; v < SPR; v++) {
        py0 = (v / (SPR - 1)) * 2 - 1;
        for (u = 0; u < SPR; u++) {
          L = lum[v * SPR + u];
          if (L < 0.05) continue;
          px0 = (u / (SPR - 1)) * 2 - 1;
          x1 = px0 * ca;
          z1 = -px0 * sa;
          y1 = py0 * ct - z1 * st;
          z2 = py0 * st + z1 * ct;
          zz = z2 + dd;
          if (zz < 0.15) continue;
          gx = ((x1 * f / zz) * 0.5 + 0.5) * cols | 0;
          gy = ((y1 * f / zz) * 0.5 + 0.5) * rows | 0;
          if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue;
          nx = sa; ny = -ca * st; nz = ca * ct;
          sh = nx * Lx + ny * Ly + nz * Lz;
          if (sh < 0) sh = 0;
          bri = 0.22 + 0.78 * sh * (0.45 + 0.55 * L);
          ci = (bri * (RAMP.length - 1)) | 0;
          if (ci <= 0) continue;
          ctx.fillStyle = bri > 0.78 ? '#FFC24B' : bri > 0.5 ? '#F7931A' : bri > 0.28 ? '#B4530A' : '#4A3313';
          ctx.fillText(RAMP[ci], gx * cw, gy * chh);
        }
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - lastT < 33) return; /* ~30 fps */
      lastT = now;
      if (!dragging) {
        vel += (0.016 - vel) * 0.006;
        a += vel;
      }
      tilt += (tiltT - tilt) * 0.07;
      drawScene();
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      if (reduced) { drawScene(); running = false; return; }
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (!running) return;
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }

    /* drag to spin */
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lx = e.clientX; ly = e.clientY; vel = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      a += dx * 0.012;
      vel = dx * 0.012;
      tiltT = Math.max(-0.85, Math.min(0.15, tiltT - dy * 0.004));
    });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.05 });
    io.observe(canvas);

    window.addEventListener('resize', function () { if (running) resize(); });
  }

  return { init: init };
})();


/* ═══════════════════════════════════════════════════════════════
   RAIN — sparse binary rain for the genesis section.
   ═══════════════════════════════════════════════════════════════ */
window.Rain = (function () {
  'use strict';

  function init(canvas, reduced) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var cols = [], cw = 16, w = 0, h = 0;
    var running = false, raf = null, last = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      if (r.width < 8) return;
      w = canvas.width = Math.round(r.width);
      h = canvas.height = Math.round(r.height);
      cols = [];
      var n = Math.ceil(w / cw);
      for (var i = 0; i < n; i++) {
        cols.push({
          x: i * cw + 2,
          y: Math.random() * h,
          s: 40 + Math.random() * 90,
          o: 0.05 + Math.random() * 0.12
        });
      }
      ctx.fillStyle = '#0B0906';
      ctx.fillRect(0, 0, w, h);
    }

    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (t - last < 66) return;
      last = t;
      ctx.fillStyle = 'rgba(11,9,6,0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '13px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        c.y += c.s * 0.066;
        if (c.y > h + 30) {
          c.y = -30 - Math.random() * 240;
          c.s = 40 + Math.random() * 90;
        }
        ctx.fillStyle = Math.random() < 0.06
          ? 'rgba(255,194,75,0.55)'
          : 'rgba(247,147,26,' + c.o.toFixed(3) + ')';
        ctx.fillText(Math.random() < 0.5 ? '0' : '1', c.x, c.y);
      }
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      if (reduced) { running = false; return; }
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (!running) return;
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.05 });
    io.observe(canvas);

    window.addEventListener('resize', function () { if (running) resize(); });
  }

  return { init: init };
})();
