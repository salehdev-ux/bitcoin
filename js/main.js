/* ═══════════════════════════════════════════════════════════════
   MAIN — orchestration: preloader, grain, cursor, nav, reveals,
   ticker, live chain data, dither panels, typing, easter eggs.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  /* ---------- toast ---------- */
  var toastEl = $('#toast');
  var toastTimer = null;
  window.toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  };

  /* ---------- grain ---------- */
  function initGrain() {
    var c = $('#grain');
    if (!c) return;
    var ctx = c.getContext('2d');
    var S = 140;
    c.width = S; c.height = S;
    var img = ctx.createImageData(S, S);
    function frame() {
      var d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    frame();
    if (!REDUCED) setInterval(frame, 120);
  }

  /* ---------- cursor ---------- */
  function initCursor() {
    if (!window.matchMedia('(pointer: fine)').matches || REDUCED) return;
    var c = $('#cursor');
    if (!c) return;
    document.documentElement.classList.add('has-cursor');
    var dot = c.querySelector('.c-dot'), ring = c.querySelector('.c-ring');
    var x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, rx = x, ry = y, seen = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; x = rx = tx; y = ry = ty; c.style.opacity = 1; }
    });
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest('a,button,[data-hover]')) c.classList.add('hov');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest('a,button,[data-hover]')) c.classList.remove('hov');
    });
    (function loop() {
      requestAnimationFrame(loop);
      x += (tx - x) * 0.4; y += (ty - y) * 0.4;
      rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
    })();
  }

  /* ---------- progress bar ---------- */
  function initProgress() {
    var bar = $('#progress');
    if (!bar) return;
    window.addEventListener('scroll', function () {
      var d = document.documentElement;
      var max = d.scrollHeight - d.clientHeight;
      bar.style.width = (max > 0 ? (d.scrollTop / max) * 100 : 0) + '%';
    }, { passive: true });
  }

  /* ---------- nav theme spy ---------- */
  function initSpy() {
    var nav = $('#nav');
    if (!nav) return;
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting && en.target.dataset.theme) {
          nav.dataset.navtheme = en.target.dataset.theme;
        }
      });
    }, { rootMargin: '-12% 0px -86% 0px', threshold: 0 });
    $$('[data-theme]').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- text splitting ---------- */
  function splitWords(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          var wi = document.createElement('span'); wi.className = 'wi';
          var w = document.createElement('span'); w.className = 'w'; w.textContent = p;
          wi.appendChild(w); frag.appendChild(wi);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        splitWords(n);
      }
    });
  }

  function splitChars(el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var holder = document.createElement('span');
    holder.setAttribute('aria-hidden', 'true');
    var chars = text.split('');
    chars.forEach(function (ch, i) {
      var wi = document.createElement('span'); wi.className = 'wi';
      var w = document.createElement('span'); w.className = 'w'; w.textContent = ch;
      w.style.transitionDelay = (i * 55) + 'ms';
      wi.appendChild(w); holder.appendChild(wi);
    });
    el.appendChild(holder);
  }

  function initReveals() {
    /* split */
    $$('[data-split]').forEach(function (el) {
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      el.setAttribute('aria-label', text);
      if (el.dataset.split === 'chars') { splitChars(el); return; }
      splitWords(el);
      el.querySelectorAll('.w').forEach(function (w, i) {
        w.style.transitionDelay = (i * 55) + 'ms';
      });
      el.querySelectorAll('.wi').forEach(function (wi) { wi.setAttribute('aria-hidden', 'true'); });
    });

    /* observe */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.hasAttribute('data-manual')) { io.unobserve(el); return; }
        if (el.classList.contains('reveal')) el.classList.add('in');
        if (el.hasAttribute('data-split')) el.classList.add('in');
        if (el.hasAttribute('data-scramble') && !REDUCED) runScramble(el);
        if (el.hasAttribute('data-count') && !el.dataset.done) { el.dataset.done = '1'; runCount(el); }
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    $$('.reveal, [data-split], [data-scramble], [data-count]').forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- scramble ---------- */
  var CH = '▓▒░<>/\\#{}=+*';
  function runScramble(el) {
    var orig = el.dataset.text || el.textContent;
    el.dataset.text = orig;
    var f = 0;
    var total = Math.max(14, orig.length * 2);
    var iv = setInterval(function () {
      f++;
      var done = Math.floor((f / total) * orig.length);
      el.textContent = orig.split('').map(function (c, i) {
        if (c === ' ') return ' ';
        return i < done ? c : CH[(Math.random() * CH.length) | 0];
      }).join('');
      if (f >= total) { el.textContent = orig; clearInterval(iv); }
    }, 34);
  }

  /* ---------- counters ---------- */
  function runCount(el) {
    var end = parseFloat(el.dataset.count) || 0;
    if (REDUCED) { el.textContent = fmt(end); return; }
    var dur = 2200, t0 = performance.now();
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(end * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- chain state / halving ---------- */
  var HEIGHT = 840000 + Math.floor((Date.now() - Date.UTC(2024, 3, 20)) / 86400000) * 141.5;
  var target = 0;
  var barPanel = null;

  function chainState(h) {
    var epoch = Math.floor(h / 210000);
    var subsidy = 50 / Math.pow(2, epoch);
    var supply = 0;
    for (var e = 0; e < epoch; e++) supply += 210000 * (50 / Math.pow(2, e));
    supply += (h % 210000) * subsidy;
    return {
      epoch: epoch,
      subsidy: subsidy,
      supply: Math.round(supply),
      next: (epoch + 1) * 210000,
      left: (epoch + 1) * 210000 - h
    };
  }

  function trim(n) { return String(n).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); }

  function applyChain() {
    var st = chainState(HEIGHT);
    $$('.tk-height').forEach(function (el) { el.textContent = fmt(HEIGHT); });
    $$('.tk-halv').forEach(function (el) { el.textContent = fmt(st.left); });
    $$('.tk-supply').forEach(function (el) { el.textContent = fmt(st.supply); });
    var sn = $('#supplyNum');
    if (sn) sn.dataset.count = st.supply;
    if (barPanel) barPanel.data.p = st.supply / 21000000;
    var bp = $('#barPct');
    if (bp) bp.textContent = (st.supply / 21000000 * 100).toFixed(1) + '% MINED';
    var hb = $('#halBlock'); if (hb) hb.textContent = fmt(st.next);
    var hbl = $('#halBlocks'); if (hbl) hbl.textContent = fmt(st.left);
    var hr = $('#halReward'); if (hr) hr.textContent = trim(st.subsidy);
    var hrn = $('#halRewardNext'); if (hrn) hrn.textContent = trim(st.subsidy / 2);
    target = Date.now() + st.left * 600000;
  }

  function tickCountdown() {
    if (!target) return;
    var diff = Math.max(0, target - Date.now());
    var d = Math.floor(diff / 86400000);
    var h = Math.floor(diff / 3600000) % 24;
    var m = Math.floor(diff / 60000) % 60;
    var s = Math.floor(diff / 1000) % 60;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var hd = $('#halD'); if (hd) hd.textContent = fmt(d);
    var hh = $('#halH'); if (hh) hh.textContent = pad(h);
    var hm = $('#halM'); if (hm) hm.textContent = pad(m);
    var hs = $('#halS'); if (hs) hs.textContent = pad(s);
  }

  function fetchText(url, ms) {
    return new Promise(function (res, rej) {
      var c = new AbortController();
      var t = setTimeout(function () { c.abort(); rej(new Error('timeout')); }, ms || 4500);
      fetch(url, { signal: c.signal }).then(function (r) {
        if (!r.ok) throw new Error('http');
        return r.text();
      }).then(function (txt) { clearTimeout(t); res(txt); })
        .catch(function (e) { clearTimeout(t); rej(e); });
    });
  }

  function fetchJSON(url, ms) {
    return fetchText(url, ms).then(function (t) { return JSON.parse(t); });
  }

  function initChain() {
    applyChain();
    tickCountdown();
    setInterval(tickCountdown, 1000);

    /* live block height (mempool.space, CORS-open) */
    fetchText('https://mempool.space/api/blocks/tip/height', 5000).then(function (t) {
      var n = parseInt(t, 10);
      if (n > 60000 && n < 100000000) {
        HEIGHT = n;
        applyChain();
        var tag = $('#navPriceTag');
        if (tag && tag.dataset.kind === 'height') tag.textContent = 'LIVE';
        window.toast('LIVE CHAIN SYNCED ✓ — HEIGHT ' + fmt(HEIGHT));
      }
    }).catch(function () {});

    /* live spot price (coinbase, CORS-open) */
    fetchJSON('https://api.coinbase.com/v2/prices/BTC-USD/spot', 5000).then(function (j) {
      var p = j && j.data && parseFloat(j.data.amount);
      if (p > 0) {
        $$('.tk-price').forEach(function (el) { el.textContent = '$' + fmt(p); });
        $$('.tk-tag').forEach(function (el) { el.textContent = 'LIVE'; });
        var np = $('#navPrice');
        if (np) np.textContent = '$' + fmt(p);
        var npt = $('#navPriceTag');
        if (npt) npt.textContent = 'LIVE';
      }
    }).catch(function () {});
  }

  /* ---------- ticker ---------- */
  function initTicker() {
    var track = $('#tickerTrack');
    if (!track) return;
    var items = [
      'BTC/USD <b class="tk-price">———</b> <i class="tk-tag">SIM</i>',
      'HEIGHT <b class="tk-height">—</b>',
      'NEXT HALVING <b class="tk-halv">—</b>&nbsp;BLOCKS',
      'SUPPLY <b class="tk-supply">—</b> / 21,000,000',
      'CONSENSUS SHA-256 · BLOCK TIME 10:00',
      'NO PREMINE · NO CEO · NO DOWNTIME',
      'NOT YOUR KEYS, NOT YOUR COINS',
      'STAY HUMBLE — STACK SATS'
    ];
    var half = items.map(function (s) { return '<span class="tick-item">' + s + '</span>'; }).join('');
    track.innerHTML = half + half;
  }

  /* ---------- typing (genesis) ---------- */
  function initTyping() {
    var el = $('#typeLine');
    if (!el) return;
    var quote = '"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"';
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.disconnect();
        if (REDUCED) { el.textContent = '> DECODE(coinbase): ' + quote; return; }
        var i = 0;
        el.textContent = '> DECODE(coinbase): ';
        var iv = setInterval(function () {
          i++;
          el.textContent = '> DECODE(coinbase): ' + quote.slice(0, i);
          if (i >= quote.length) clearInterval(iv);
        }, 34);
      });
    }, { threshold: 0.4 });
    io.observe(el);
  }

  /* ---------- dither panels ---------- */
  var panels = [];
  function initPanels() {
    if (!window.Dither) return;
    var defs = [
      ['#heroCanvas', window.Dither.paint.hero, window.Dither.PAL.hero, { cell: 4, fps: 12 }],
      ['#coinCanvas', window.Dither.paint.coin, window.Dither.PAL.coin, { cell: 3, fps: 14, hoverable: true }],
      ['#barCanvas', window.Dither.paint.bar, window.Dither.PAL.bar, { cell: 3, fps: 12, data: { p: 0.955 } }],
      ['#iconScare', window.Dither.paint.iconScare, window.Dither.PAL.icon, { cell: 3, fps: 14, hoverable: true }],
      ['#iconKey', window.Dither.paint.iconKey, window.Dither.PAL.icon, { cell: 3, fps: 14, hoverable: true }],
      ['#iconNet', window.Dither.paint.iconNet, window.Dither.PAL.icon, { cell: 3, fps: 14, hoverable: true }]
    ];
    defs.forEach(function (d) {
      var cv = $(d[0]);
      if (!cv) return;
      panels.push(new window.Dither.Panel(cv, { paint: d[1], palette: d[2], cell: d[3].cell, fps: d[3].fps, hoverable: d[3].hoverable, data: d[3].data }));
    });

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        panels.forEach(function (p) {
          if (p.cv === en.target) {
            p.visible = en.isIntersecting;
            if (p.visible) { p.resize(); if (!REDUCED) p.start(); }
            else p.stop();
          }
        });
      });
    }, { threshold: 0.02 });
    panels.forEach(function (p) { io.observe(p.cv); });
    panels.forEach(function (p) { p.resize(); });

    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () { panels.forEach(function (p) { p.resize(); }); }, 160);
    });

    /* hero mouse parallax */
    var hero = $('#hero');
    var heroP = panels[0];
    if (hero && heroP) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        heroP.mouseT.x = (e.clientX - r.left) / r.width;
        heroP.mouseT.y = (e.clientY - r.top) / r.height;
      });
    }
    barPanel = panels[2] || null;
  }

  /* ---------- preloader ---------- */
  function initPreloader() {
    var pre = $('#preloader');
    var lines = $('#preLines');
    var title = $('#heroTitle');
    var finish = function () {
      if (document.body.classList.contains('loaded')) return;
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');
      if (pre) { pre.classList.add('done'); setTimeout(function () { pre.hidden = true; }, 550); }
      if (title) title.classList.add('in');
    };
    if (REDUCED || !pre || !lines) { finish(); return; }
    pre.hidden = false;
    var script = [
      '> bitcoin.exe --init',
      '> loading mempool.dither …',
      '> syncing headers  [▓▓▓▓▓▓▓▓░░] 82%',
      '> peers: 8 · chain: verified ✓',
      '> entering block 0'
    ];
    var i = 0;
    var iv = setInterval(function () {
      if (i >= script.length) {
        clearInterval(iv);
        setTimeout(finish, 420);
        return;
      }
      var span = document.createElement('span');
      if (script[i].indexOf('✓') > -1) span.className = 'ok';
      if (script[i].indexOf('▓') > -1) span.className = 'bar';
      span.textContent = script[i] + '\n';
      lines.appendChild(span);
      i++;
    }, 260);
    setTimeout(finish, 5000); /* safety */
  }

  /* ---------- easter eggs ---------- */
  function initEggs() {
    var kbuf = '';
    window.addEventListener('keydown', function (e) {
      if (!e.key || e.key.length !== 1) return;
      kbuf = (kbuf + e.key.toLowerCase()).slice(-6);
      var flash = $('#flash');
      if (kbuf.endsWith('21')) {
        if (flash) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
        window.toast('21 MILLION. NO MORE. EVER.');
        kbuf = '';
      } else if (kbuf.endsWith('hodl')) {
        window.toast('HODL CONFIRMED — DIAMOND HANDS DETECTED 💎');
        kbuf = '';
      }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    initGrain();
    initCursor();
    initProgress();
    initSpy();
    initTicker();
    initReveals();
    initTyping();
    initPanels();
    initChain();
    if (window.AsciiCoin) window.AsciiCoin.init($('#asciiCoin'), REDUCED);
    if (window.Rain) window.Rain.init($('#rainCanvas'), REDUCED);
    if (window.Miner) window.Miner.init();
    initEggs();
    initPreloader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
