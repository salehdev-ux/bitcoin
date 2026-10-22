/* ═══════════════════════════════════════════════════════════════
   MINER — a real SHA-256 implemented from scratch (FIPS 180-4).
   The demo "mines" a candidate block header by grinding nonces
   until the digest starts with the target zeros — exactly what
   the network does, just at pocket scale. Runs synchronously in
   small time-slices so the page stays alive.
   ═══════════════════════════════════════════════════════════════ */
window.Miner = (function () {
  'use strict';

  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  var W = new Uint32Array(64);
  var Hh = new Uint32Array(8);
  var buf = new Uint8Array(64);
  var dv = new DataView(buf.buffer);

  var off = 0, msgLen = 0;

  function layout(session) {
    var head = 'btc.demo/block/' + session + '/';
    for (var i = 0; i < head.length; i++) buf[i] = head.charCodeAt(i);
    off = head.length;
    msgLen = off + 10; /* + fixed-width 10-digit nonce */
    for (var j = off; j < 64; j++) buf[j] = 0;
    buf[msgLen] = 0x80;
    dv.setUint32(56, 0);
    dv.setUint32(60, msgLen * 8);
  }

  function writeNonce(n) {
    var x = n;
    for (var i = off + 9; i >= off; i--) {
      buf[i] = 48 + (x % 10);
      x = (x / 10) | 0;
    }
  }

  function shaBlock() {
    Hh[0] = 0x6a09e667 | 0; Hh[1] = 0xbb67ae85 | 0;
    Hh[2] = 0x3c6ef372 | 0; Hh[3] = 0xa54ff53a | 0;
    Hh[4] = 0x510e527f | 0; Hh[5] = 0x9b05688c | 0;
    Hh[6] = 0x1f83d9ab | 0; Hh[7] = 0x5be0cd19 | 0;

    for (var j = 0; j < 16; j++) W[j] = dv.getUint32(j * 4);
    for (var j2 = 16; j2 < 64; j2++) {
      var x = W[j2 - 15], y = W[j2 - 2];
      var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      W[j2] = (W[j2 - 16] + s0 + W[j2 - 7] + s1) | 0;
    }

    var a = Hh[0], b = Hh[1], c = Hh[2], d = Hh[3];
    var e = Hh[4], f = Hh[5], g = Hh[6], hh = Hh[7];

    for (var j3 = 0; j3 < 64; j3++) {
      var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      var ch = (e & f) ^ (~e & g);
      var t1 = (hh + S1 + ch + K[j3] + W[j3]) | 0;
      var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      var mj = (a & b) ^ (a & c) ^ (b & c);
      var t2 = (S0 + mj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }

    Hh[0] = (Hh[0] + a) | 0; Hh[1] = (Hh[1] + b) | 0;
    Hh[2] = (Hh[2] + c) | 0; Hh[3] = (Hh[3] + d) | 0;
    Hh[4] = (Hh[4] + e) | 0; Hh[5] = (Hh[5] + f) | 0;
    Hh[6] = (Hh[6] + g) | 0; Hh[7] = (Hh[7] + hh) | 0;
  }

  function hexOut() {
    var s = '';
    for (var i = 0; i < 8; i++) s += (Hh[i] >>> 0).toString(16).padStart(8, '0');
    return s;
  }

  function meets(D) {
    var sh = 32 - 4 * D;
    return (Hh[0] >>> sh) === 0;
  }

  function zerosRun() {
    return Math.clz32(Hh[0] >>> 0) >> 2;
  }

  /* ---------- state ---------- */
  var running = false, nonce = 0, attempts = 0, best = 0;
  var D = 4, session = 1;
  var lastUI = 0, lastAtt = 0, lastT = 0, rate = 0;
  var els = {};

  function fmt(n) { return n.toLocaleString('en-US'); }

  function updateUI(now, force) {
    if (!force && now - lastUI < 90) return;
    lastUI = now;
    var dt = (now - lastT) / 1000;
    if (dt > 0.05) {
      var inst = (attempts - lastAtt) / dt;
      rate = rate * 0.7 + inst * 0.3;
      lastAtt = attempts;
      lastT = now;
    }
    var hash = hexOut();
    var zeros = hash.match(/^0*/)[0].length;
    els.hash.innerHTML = '<em>' + '0'.repeat(zeros) + '</em>' + hash.slice(zeros);
    els.attempts.textContent = fmt(attempts);
    els.nonce.textContent = fmt(nonce);
    els.rate.textContent = fmt(Math.round(rate));
    els.best.textContent = best;
    els.bar.style.width = Math.min(100, (attempts / Math.pow(16, D)) * 100) + '%';
  }

  function tick() {
    if (!running) return;
    var t0 = performance.now();
    var found = false;
    while (performance.now() - t0 < 10) {
      for (var k = 0; k < 2000; k++) {
        writeNonce(nonce);
        shaBlock();
        attempts++;
        var zr = zerosRun();
        if (zr > best) best = zr;
        if (meets(D)) { found = true; break; }
        nonce++;
      }
    }
    if (found) { onFound(); return; }
    updateUI(performance.now(), false);
    setTimeout(tick, 0);
  }

  function onFound() {
    running = false;
    var hash = hexOut();
    updateUI(performance.now(), true);
    els.bar.style.width = '100%';
    els.status.textContent = 'FOUND ✓';
    els.status.dataset.state = 'found';
    els.btn.textContent = 'MINE AGAIN';
    log('BLOCK FOUND · nonce=' + nonce + ' · ' + hash, true);
    els.stamp.classList.remove('show');
    void els.stamp.offsetWidth;
    els.stamp.classList.add('show');
    els.card.classList.remove('shake');
    void els.card.offsetWidth;
    els.card.classList.add('shake');
    burstConfetti();
    window.toast && window.toast('HASH SECURED — ' + '0'.repeat(D) + ' prefix verified ✓');
  }

  function startStop() {
    if (running) {
      running = false;
      els.btn.textContent = 'RESUME';
      els.status.textContent = 'PAUSED';
      els.status.dataset.state = 'idle';
      return;
    }
    layout(session);
    running = true;
    els.btn.textContent = 'PAUSE';
    els.status.textContent = 'GRINDING…';
    els.status.dataset.state = 'run';
    lastAtt = attempts;
    lastT = performance.now();
    setTimeout(tick, 0);
  }

  function reset() {
    running = false;
    session++;
    nonce = 0; attempts = 0; best = 0; rate = 0;
    layout(session);
    els.attempts.textContent = '0';
    els.nonce.textContent = '0';
    els.rate.textContent = '0';
    els.best.textContent = '0';
    els.bar.style.width = '0%';
    els.hash.textContent = '— press START MINING to grind real hashes —';
    els.btn.textContent = 'START MINING';
    els.status.textContent = 'IDLE';
    els.status.dataset.state = 'idle';
    els.stamp.classList.remove('show');
    els.log.innerHTML = '';
  }

  function log(msg, hit) {
    var line = document.createElement('div');
    if (hit) line.className = 'hit';
    line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
    els.log.prepend(line);
    while (els.log.children.length > 4) els.log.lastChild.remove();
  }

  /* ---------- ascii confetti ---------- */
  var confCtx = null, confRaf = null, particles = [];
  var CHARS = '$#&@%*=+:'.split('');

  function burstConfetti() {
    var cv = document.getElementById('confetti');
    if (!cv) return;
    var r = cv.parentElement.getBoundingClientRect();
    cv.width = Math.max(10, Math.round(r.width));
    cv.height = Math.max(10, Math.round(r.height));
    confCtx = cv.getContext('2d');
    particles = [];
    for (var i = 0; i < 90; i++) {
      particles.push({
        x: cv.width / 2 + (Math.random() - 0.5) * cv.width * 0.3,
        y: cv.height * 0.35,
        vx: (Math.random() - 0.5) * 9,
        vy: -(3 + Math.random() * 8),
        g: 0.16 + Math.random() * 0.08,
        ch: CHARS[(Math.random() * CHARS.length) | 0],
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        life: 90 + Math.random() * 50,
        col: ['#F7931A', '#FFC24B', '#F4EDE3', '#B4530A'][(Math.random() * 4) | 0]
      });
    }
    if (confRaf) cancelAnimationFrame(confRaf);
    confLoop();
  }

  function confLoop() {
    confRaf = requestAnimationFrame(confLoop);
    if (!confCtx) return;
    var cv = confCtx.canvas;
    confCtx.clearRect(0, 0, cv.width, cv.height);
    var alive = false;
    confCtx.font = '700 16px "IBM Plex Mono", ui-monospace, monospace';
    confCtx.textAlign = 'center';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.life <= 0) continue;
      alive = true;
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life--;
      confCtx.save();
      confCtx.globalAlpha = Math.max(0, Math.min(1, p.life / 60));
      confCtx.translate(p.x, p.y);
      confCtx.rotate(p.rot);
      confCtx.fillStyle = p.col;
      confCtx.fillText(p.ch, 0, 0);
      confCtx.restore();
    }
    if (!alive) {
      cancelAnimationFrame(confRaf);
      confRaf = null;
      confCtx.clearRect(0, 0, cv.width, cv.height);
    }
  }

  /* ---------- init ---------- */
  function init() {
    els.card = document.getElementById('mineCard');
    els.btn = document.getElementById('mineBtn');
    els.reset = document.getElementById('mineReset');
    els.hash = document.getElementById('mineHash');
    els.attempts = document.getElementById('mineAttempts');
    els.nonce = document.getElementById('mineNonce');
    els.rate = document.getElementById('mineRate');
    els.best = document.getElementById('mineBest');
    els.bar = document.getElementById('mineBar');
    els.log = document.getElementById('mineLog');
    els.status = document.getElementById('mineStatus');
    els.stamp = document.getElementById('stamp');
    els.target = document.getElementById('mineTarget');
    if (!els.card || !els.btn) return;

    layout(session);
    els.target.textContent = '0'.repeat(D) + '*'.repeat(8) + '…';

    els.btn.addEventListener('click', startStop);
    els.reset.addEventListener('click', reset);

    document.querySelectorAll('.diff button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.diff button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        D = parseInt(b.dataset.d, 10);
        els.target.textContent = '0'.repeat(D) + '*'.repeat(8) + '…';
        els.bar.style.width = '0%';
        log('difficulty set to ' + '0'.repeat(D));
      });
    });
  }

  return { init: init, sha256hex: function (s) {
    var bytes = new TextEncoder().encode(s);
    if (bytes.length > 55) throw new Error('demo only');
    layout('');
    /* splice message */
    for (var i = 0; i < bytes.length; i++) buf[i] = bytes[i];
    for (var j = bytes.length; j < 64; j++) buf[j] = 0;
    buf[bytes.length] = 0x80;
    dv.setUint32(56, 0);
    dv.setUint32(60, bytes.length * 8);
    shaBlock();
    return hexOut();
  } };
})();
