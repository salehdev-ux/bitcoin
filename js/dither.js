/* ═══════════════════════════════════════════════════════════════
   DITHER — ordered Bayer 8×8 quantization of procedural scenes.
   Each Panel renders a scene at "cell" resolution, then the
   browser upscales it with nearest-neighbour (pixelated CSS).
   ═══════════════════════════════════════════════════════════════ */
window.Dither = (function () {
  'use strict';

  var BAYER = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];

  function hex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }

  var PAL = {
    hero: ['#0B0906', '#16352A', '#B4530A', '#F7931A', '#FFC24B', '#F4EDE3'].map(hex),
    coin: ['#0E0C09', '#B4530A', '#F7931A', '#FFC24B', '#F4EDE3'].map(hex),
    bar:  ['#0E0C09', '#B4530A', '#F7931A', '#FFC24B'].map(hex),
    icon: ['#0E0C09', '#F7931A', '#F4EDE3'].map(hex)
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Panel ---------- */
  function Panel(canvas, opts) {
    opts = opts || {};
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.paintFn = opts.paint || paint.hero;
    this.palette = opts.palette || PAL.hero;
    this.cell = opts.cell || 4;
    this.fps = opts.fps || 12;
    this.data = opts.data || {};
    this.hoverable = !!opts.hoverable;
    this.visible = false;
    this.hover = 0; this.hoverT = 0;
    this.mouse = { x: 0.5, y: 0.5 };
    this.mouseT = { x: 0.5, y: 0.5 };
    this._raf = null;
    this._last = -1e9;
    this._bound = false;
    this.scene = document.createElement('canvas');
    this.sctx = this.scene.getContext('2d', { willReadFrequently: true });
    this.bind();
  }

  Panel.prototype.bind = function () {
    if (this._bound) return;
    this._bound = true;
    var self = this;
    if (this.hoverable) {
      this.cv.addEventListener('pointerenter', function () { self.hoverT = 1; });
      this.cv.addEventListener('pointerleave', function () { self.hoverT = 0; });
    }
  };

  Panel.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    var w = Math.max(24, Math.round(r.width / this.cell));
    var h = Math.max(24, Math.round(r.height / this.cell));
    if (this.cv.width !== w || this.cv.height !== h) {
      this.cv.width = w;
      this.cv.height = h;
      this.out = this.ctx.createImageData(w, h);
    }
    this.w = w; this.h = h;
    if (this.scene.width !== w || this.scene.height !== h) {
      this.scene.width = w; this.scene.height = h;
    }
    this.render(performance.now() / 1000);
  };

  Panel.prototype.render = function (t) {
    var w = this.w, h = this.h;
    if (!w) return;
    if (!this.out || this.out.width !== w || this.out.height !== h) {
      this.out = this.ctx.createImageData(w, h);
    }
    this.hover += (this.hoverT - this.hover) * 0.12;
    this.mouse.x += (this.mouseT.x - this.mouse.x) * 0.06;
    this.mouse.y += (this.mouseT.y - this.mouse.y) * 0.06;

    this.paintFn(this.sctx, w, h, t, this);
    var src = this.sctx.getImageData(0, 0, w, h).data;
    var out = this.out.data;
    var pal = this.palette, n = pal.length;
    var shim = this.hover * 0.13;
    var i4 = 0;
    for (var y = 0; y < h; y++) {
      var brow = BAYER[y & 7];
      var p0 = pal[0];
      for (var x = 0; x < w; x++, i4 += 4) {
        var a = src[i4 + 3] / 255;
        var r = p0[0] + (src[i4] - p0[0]) * a;
        var g = p0[1] + (src[i4 + 1] - p0[1]) * a;
        var b = p0[2] + (src[i4 + 2] - p0[2]) * a;
        var v = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        if (shim > 0.003) v += shim * Math.sin(x * 0.35 + t * 5 + y * 0.22);
        var idx = (v * n + (brow[x & 7] + 0.5) / 64) | 0;
        if (idx < 0) idx = 0; else if (idx >= n) idx = n - 1;
        var c = pal[idx];
        out[i4] = c[0]; out[i4 + 1] = c[1]; out[i4 + 2] = c[2]; out[i4 + 3] = 255;
      }
    }
    this.ctx.putImageData(this.out, 0, 0);
  };

  Panel.prototype.start = function () {
    if (this._raf || document.hidden) return;
    var self = this;
    var loop = function (now) {
      self._raf = requestAnimationFrame(loop);
      if (now - self._last < 1000 / self.fps) return;
      self._last = now;
      self.render(now / 1000);
    };
    this._raf = requestAnimationFrame(loop);
  };

  Panel.prototype.stop = function () {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  };

  /* ---------- painters ---------- */
  function hill(ctx, w, h, yb, amp, freq, ph, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (var x = 0; x <= w; x += 2) {
      var y = yb * h + Math.sin((x / w) * freq * 6.2832 + ph) * amp * h;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  var STEPS = [0.70, 0.69, 0.72, 0.66, 0.68, 0.60, 0.62, 0.52, 0.55, 0.42, 0.45, 0.30, 0.33, 0.16];

  var paint = {};

  paint.hero = function (ctx, w, h, t, P) {
    var m = P.mouse;

    /* night sky, warming toward the horizon */
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0F0D0A');
    sky.addColorStop(0.55, '#1C1109');
    sky.addColorStop(0.75, '#3B2009');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    /* stars */
    var rnd = mulberry32(20090103);
    for (var i = 0; i < 130; i++) {
      var sxr = rnd() * w, syr = rnd() * h * 0.52;
      var tw = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.7));
      ctx.fillStyle = 'rgba(255,238,205,' + (tw * (0.25 + rnd() * 0.75)).toFixed(3) + ')';
      ctx.fillRect(sxr, syr, 1, 1);
    }

    /* the coin-sun */
    var sx = (0.68 + (m.x - 0.5) * 0.07) * w;
    var sy = (0.40 + Math.sin(t * 0.22) * 0.015 + (0.5 - m.y) * 0.05) * h;
    var R = Math.min(w, h) * 0.30;
    var glow = ctx.createRadialGradient(sx, sy, R * 0.05, sx, sy, R * 2.0);
    glow.addColorStop(0, '#FFF3D6');
    glow.addColorStop(0.25, '#FFC24B');
    glow.addColorStop(0.52, '#F7931A');
    glow.addColorStop(1, 'rgba(247,147,26,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, R * 2.0, 0, 6.2832); ctx.fill();

    /* satellite nodes orbiting behind the sun */
    var k, ang, ox, oy, front, px, py;
    for (k = 0; k < 9; k++) {
      ang = t * 0.28 + (k / 9) * 6.2832;
      ox = Math.cos(ang); oy = Math.sin(ang);
      front = oy > 0;
      if (front) continue;
      px = sx + ox * R * 1.42;
      py = sy + oy * R * 0.5;
      ctx.fillStyle = 'rgba(180,83,10,0.85)';
      ctx.fillRect(px, py, 1.2, 1.2);
    }

    ctx.fillStyle = '#FFEFC9';
    ctx.beginPath(); ctx.arc(sx, sy, R * 0.5, 0, 6.2832); ctx.fill();

    /* satellite nodes orbiting in front */
    for (k = 0; k < 9; k++) {
      ang = t * 0.28 + (k / 9) * 6.2832;
      ox = Math.cos(ang); oy = Math.sin(ang);
      front = oy > 0;
      if (!front) continue;
      px = sx + ox * R * 1.42;
      py = sy + oy * R * 0.5;
      ctx.fillStyle = '#F4EDE3';
      ctx.fillRect(px, py, 1.7, 1.7);
    }

    /* drifting clouds */
    function cloud(cx, cy, s, tone) {
      ctx.fillStyle = tone;
      var parts = [[0, 0, 1.6, 0.5], [-0.9, 0.18, 0.9, 0.34], [0.9, 0.2, 1.0, 0.36], [-0.35, -0.22, 0.8, 0.34], [0.5, -0.16, 0.7, 0.3]];
      for (var j = 0; j < parts.length; j++) {
        ctx.beginPath();
        ctx.ellipse(cx + parts[j][0] * s, cy + parts[j][1] * s, parts[j][2] * s, parts[j][3] * s, 0, 0, 6.2832);
        ctx.fill();
      }
    }
    function drift(base, speed) { return ((base + t * speed) % 2.0 - 0.5) * w; }
    cloud(drift(0.0, 0.010), 0.15 * h, w * 0.075, 'rgba(244,237,227,0.92)');
    cloud(drift(0.7, 0.007), 0.30 * h, w * 0.055, 'rgba(244,237,227,0.72)');
    cloud(drift(1.5, 0.005), 0.53 * h, w * 0.045, 'rgba(255,194,75,0.55)');

    /* green hills — a nod to the meadow poster */
    hill(ctx, w, h, 0.68, 0.045, 1.2, 1.2, '#1E4A38');
    hill(ctx, w, h, 0.74, 0.030, 2.2, 4.1, '#16352A');

    /* the mountain on the right is the price chart, stepping up forever */
    var x0 = w * 0.46, seg = (w - x0) / STEPS.length;
    ctx.fillStyle = '#12291F';
    ctx.beginPath();
    ctx.moveTo(x0, h);
    var py2 = STEPS[0] * h;
    ctx.lineTo(x0, py2);
    for (var s = 0; s < STEPS.length; s++) {
      var yv = STEPS[s] * h;
      ctx.lineTo(x0 + seg * (s + 1), py2);
      ctx.lineTo(x0 + seg * (s + 1), yv);
      py2 = yv;
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    /* trend line + live end dot */
    ctx.strokeStyle = 'rgba(244,237,227,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, STEPS[0] * h);
    var py3 = STEPS[0] * h;
    for (var s2 = 0; s2 < STEPS.length; s2++) {
      var yv2 = STEPS[s2] * h;
      ctx.lineTo(x0 + seg * (s2 + 1), py3);
      ctx.lineTo(x0 + seg * (s2 + 1), yv2);
      py3 = yv2;
    }
    ctx.stroke();
    var endX = x0 + seg * STEPS.length, endY = STEPS[STEPS.length - 1] * h;
    var pr = 1.5 + Math.sin(t * 3) * 0.8;
    ctx.fillStyle = '#FFC24B';
    ctx.fillRect(endX - pr, endY - pr, pr * 2, pr * 2);

    /* foreground ink hill + scattered sats-as-flowers */
    hill(ctx, w, h, 0.86, 0.035, 1.6, 2.4, '#120F0B');
    var rnd2 = mulberry32(21);
    for (var f = 0; f < 70; f++) {
      var fx = rnd2() * w, fy = 0.875 * h + rnd2() * 0.105 * h;
      ctx.fillStyle = rnd2() < 0.55 ? '#F7931A' : '#FFC24B';
      ctx.fillRect(fx, fy, 1.3, 1.3);
    }

    /* horizon glow line */
    ctx.fillStyle = 'rgba(244,237,227,0.32)';
    ctx.fillRect(0, 0.68 * h, w, 1);
  };

  paint.coin = function (ctx, w, h, t, P) {
    ctx.fillStyle = '#F4EDE3';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) * (0.36 + 0.02 * P.hover);

    var g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.1);
    g.addColorStop(0, 'rgba(255,194,75,0.95)');
    g.addColorStop(0.5, 'rgba(247,147,26,0.38)');
    g.addColorStop(1, 'rgba(244,237,227,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#F7931A';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();

    ctx.strokeStyle = '#B4530A';
    ctx.lineWidth = Math.max(1.5, R * 0.07);
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.87, 0, 6.2832); ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.24);
    ctx.fillStyle = '#0E0C09';
    ctx.font = '900 ' + (R * 1.12) + 'px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', 0, R * 0.06);
    ctx.fillRect(R * 0.10, -R * 0.80, R * 0.14, R * 0.36);
    ctx.fillRect(R * 0.10, R * 0.44, R * 0.14, R * 0.36);
    ctx.restore();

    /* faint engraved ring text suggestion */
    ctx.strokeStyle = 'rgba(14,12,9,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.74, 0.6, 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.74, 3.7, 5.3); ctx.stroke();
  };

  paint.bar = function (ctx, w, h, t, P) {
    var p = P.data.p || 0;
    var edge = Math.round(w * p);
    ctx.fillStyle = '#0E0C09';
    ctx.fillRect(0, 0, w, h);

    var grad = ctx.createLinearGradient(0, 0, edge, 0);
    grad.addColorStop(0, '#B4530A');
    grad.addColorStop(0.6, '#F7931A');
    grad.addColorStop(1, '#FFC24B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, edge, h);

    ctx.fillStyle = '#17130F';
    ctx.fillRect(edge, 0, w - edge, h);

    /* decade ticks */
    ctx.fillStyle = 'rgba(244,237,227,0.22)';
    for (var i = 1; i < 10; i++) ctx.fillRect(Math.round(w * i / 10), 0, 1, h);

    /* shimmering boundary */
    ctx.fillStyle = '#F4EDE3';
    ctx.fillRect(edge - 1, 0, 2, h);
    for (var s = 0; s < 6; s++) {
      var yy = ((t * 26 + s * h / 6) % h);
      ctx.fillStyle = '#FFC24B';
      ctx.fillRect(edge - 3 + (s % 2) * 4, yy, 2, 2);
    }
  };

  paint.iconScare = function (ctx, w, h) {
    ctx.fillStyle = '#0E0C09';
    ctx.fillRect(0, 0, w, h);
    var c = w / 2, s = Math.min(w, h) * 0.30;
    ctx.save();
    ctx.translate(c, h / 2);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#F4EDE3';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.strokeStyle = '#F7931A';
    ctx.strokeRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
    ctx.restore();
    ctx.fillStyle = '#F4EDE3';
    ctx.font = '900 ' + (h * 0.34) + 'px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('21', c, h * 0.52);
  };

  paint.iconKey = function (ctx, w, h) {
    ctx.fillStyle = '#0E0C09';
    ctx.fillRect(0, 0, w, h);
    var u = Math.min(w, h);
    ctx.strokeStyle = '#F4EDE3';
    ctx.lineWidth = Math.max(2, u * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(w * 0.36, h * 0.5, u * 0.155, 0, 6.2832); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.515, h * 0.5);
    ctx.lineTo(w * 0.88, h * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.72, h * 0.5); ctx.lineTo(w * 0.72, h * 0.66);
    ctx.moveTo(w * 0.87, h * 0.5); ctx.lineTo(w * 0.87, h * 0.71);
    ctx.stroke();
    ctx.fillStyle = '#F7931A';
    ctx.fillRect(w * 0.32, h * 0.46, u * 0.08, u * 0.08);
  };

  paint.iconNet = function (ctx, w, h) {
    ctx.fillStyle = '#0E0C09';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.30;
    ctx.strokeStyle = 'rgba(247,147,26,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.32, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(244,237,227,0.9)';
    for (var k = 0; k < 6; k++) {
      var a = (k / 6) * 6.2832 + 0.52;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, Math.min(w, h) * 0.045, 0, 6.2832); ctx.stroke();
    }
    ctx.fillStyle = '#F7931A';
    ctx.fillRect(cx - r * 0.15, cy - r * 0.15, r * 0.30, r * 0.30);
  };

  return { Panel: Panel, PAL: PAL, paint: paint };
})();
