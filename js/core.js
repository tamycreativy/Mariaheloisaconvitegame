/* Sweet Race — núcleo compartilhado: sons, cards, contagem, brilhos.
   Cada jogo (race.js, match.js, factory.js) usa só o que está aqui. */
window.SR = (function () {
  var SR = { games: {}, state: { muted: false }, config: { music: "" } };
  var W = 941, H = 1672; // espaço de desenho das artes (px)
  SR.W = W; SR.H = H;

  SR.$ = function (s, r) { return (r || document).querySelector(s); };
  SR.el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  SR.rand = function (a, b) { return a + Math.random() * (b - a); };
  SR.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  SR.shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  SR.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  // posições/tamanhos em "px da arte" → % ou cqw do palco
  SR.pctX = function (x) { return (x / W * 100) + "%"; };
  SR.pctY = function (y) { return (y / H * 100) + "%"; };
  SR.cq = function (px) { return (px / W * 100) + "cqw"; };
  SR.asset = function (n) { return "assets/" + n + ".webp"; };
  // ponteiro (clientX/Y) → coordenadas da arte
  SR.toArt = function (stage, ev) {
    var r = stage.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
  };

  /* ---------- áudio (tudo gerado em código; sem arquivos) ---------- */
  var ctx = null, master = null, musicEl = null, musicVol = 0.3, fadeT = null;
  var musicGain = null, musicLvl = "normal";
  var LEVEL = { low: 0.2, normal: 0.55 };                // volume da música (relativo): baixa nos jogos/abertura, normal no resto
  SR.audioInit = function () {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = SR.state.muted ? 0 : 0.5; master.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (SR.config.music && !musicEl) {
      musicEl = new Audio(SR.config.music); musicEl.loop = true; musicEl.muted = SR.state.muted;
      if (ctx) { try { musicGain = ctx.createGain(); musicGain.gain.value = LEVEL[musicLvl]; ctx.createMediaElementSource(musicEl).connect(musicGain); musicGain.connect(master); } catch (e) { musicGain = null; } }
      if (!musicGain) musicEl.volume = LEVEL[musicLvl];
    }
    if (musicEl && musicEl.paused) { var p = musicEl.play(); if (p && p.catch) p.catch(function () {}); }
  };
  document.addEventListener("pointerdown", function () { if (musicEl && musicEl.paused && !SR.state.muted) SR.audioInit(); }, true);
  SR.musicLevel = function (lvl) {
    musicLvl = lvl;
    if (musicGain) musicGain.gain.setTargetAtTime(LEVEL[lvl], ctx.currentTime, 0.4);
    else if (musicEl) musicEl.volume = LEVEL[lvl];
  };
  SR.setMuted = function (m) {
    SR.state.muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
    if (musicEl) musicEl.muted = m;
    var v = document.getElementById("abertura"); if (v) v.muted = m;
    var b = document.getElementById("snd"); if (b) b.classList.toggle("off", m);
  };
  function tone(f, d, type, vol, delay, slide) {
    if (!ctx || SR.state.muted) return;
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  SR.sfx = {
    tap: function () { tone(520, 0.07, "triangle", 0.2); },
    swap: function () { tone(380, 0.09, "triangle", 0.22, 0, 560); },
    bad: function () { tone(180, 0.22, "sawtooth", 0.16, 0, 90); },
    pop: function (n) { var f = 520 * Math.pow(1.12, Math.min(n || 0, 8)); tone(f, 0.12, "sine", 0.28); tone(f * 1.5, 0.14, "triangle", 0.18, 0.05); },
    coin: function () { tone(880, 0.08, "square", 0.12); tone(1320, 0.14, "square", 0.12, 0.07); },
    crash: function () { tone(140, 0.3, "sawtooth", 0.25, 0, 50); tone(90, 0.35, "square", 0.15, 0.02, 40); },
    whoosh: function () { tone(300, 0.12, "triangle", 0.1, 0, 700); },
    count: function () { tone(660, 0.14, "triangle", 0.28); },
    go: function () { tone(990, 0.3, "triangle", 0.3); tone(1320, 0.3, "triangle", 0.2, 0.05); },
    win: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.28, "triangle", 0.3, i * 0.11); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.3, "triangle", 0.25, i * 0.16); }); }
  };

  /* ---------- peças de interface (mesmo estilo dos cards aprovados) ---------- */
  var ICONS = ["🏎️", "🍬", "🏭"], COLS = ["#ff3d9a", "#14c9cf", "#9b5cff"];
  // barra de progresso dos 3 desafios (canto superior esquerdo)
  SR.progress = function (root, index) {
    var p = SR.el("div", "prog");
    ICONS.forEach(function (ic, i) {
      var c = SR.el("i", i < index ? "on done" : i === index ? "on" : "", ic); c.style.setProperty("--c", COLS[i]); p.appendChild(c);
    });
    root.appendChild(p); return p;
  };
  SR.say = function (root, who, html) {
    var s = SR.el("div", "say", '<b class="who">' + who + "</b><p>" + html + "</p>"); root.appendChild(s);
    s.set = function (h) { s.querySelector("p").innerHTML = h; s.classList.remove("hide"); };
    return s;
  };
  SR.pill = function (root, html, style, cls) {
    var p = SR.el("div", "pill" + (cls ? " " + cls : ""), html); p.style.cssText = style || ""; root.appendChild(p); return p;
  };
  // card grande: briefing de cada desafio e vitória
  SR.card = function (root, o) {
    var dim = SR.el("div", "dim"); root.appendChild(dim);
    if (o.rays) root.appendChild(SR.el("div", "rays"));
    var c = SR.el("div", "win");
    c.innerHTML = '<div class="in"><span class="peek">' + o.icon + '</span><span class="badge">' + o.badge + "</span><h2>" + o.title + "</h2>" +
      (o.extra || "") + "<p>" + o.text + '</p><button class="go" type="button">' + o.button + "</button>" +
      (o.button2 ? '<br><button class="go sec" type="button">' + o.button2 + "</button>" : "") + "</div>";
    if (o.top) c.style.top = o.top;
    root.appendChild(c);
    function close() { dim.remove(); c.remove(); var r = root.querySelector(".rays"); if (r) r.remove(); }
    var btns = c.querySelectorAll("button");
    btns[0].addEventListener("click", function () { SR.audioInit(); SR.sfx.tap(); close(); o.onClick && o.onClick(); });
    if (btns[1]) btns[1].addEventListener("click", function () { SR.audioInit(); SR.sfx.tap(); close(); o.onClick2 && o.onClick2(); });
    return { close: close, el: c };
  };
  SR.countdown = function (root, cb) {
    var n = 3;
    function step() {
      var c = SR.el("div", "count", "<span" + (n === 0 ? ' class="vai"' : "") + ">" + (n === 0 ? "Já!" : n) + "</span>"); root.appendChild(c);
      if (n === 0) SR.sfx.go(); else SR.sfx.count();
      setTimeout(function () { c.remove(); }, 900);
      if (n === 0) { setTimeout(cb, 350); return; }
      n--; setTimeout(step, 800);
    }
    step();
  };
  SR.toast = function (root, text, x, y) {
    var t = SR.el("div", "toast", text); t.style.left = SR.pctX(x); t.style.top = SR.pctY(y); root.appendChild(t);
    setTimeout(function () { t.remove(); }, 1150);
  };
  var SPARK = ["#ff3d9a", "#ffd23f", "#14c9cf", "#9b5cff", "#fff", "#ff9f43"];
  SR.sparks = function (root, x, y, n) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      var s = SR.el("div", "spark"); s.style.left = SR.pctX(x); s.style.top = SR.pctY(y); s.style.background = SR.pick(SPARK); root.appendChild(s);
      var a = Math.random() * Math.PI * 2, d = SR.rand(40, 110), dx = Math.cos(a) * d / W * 100, dy = Math.sin(a) * d / W * 100;
      var an = s.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: "translate(" + dx + "cqw," + dy + "cqw) scale(.2)", opacity: 0 }], { duration: SR.rand(380, 620), easing: "ease-out" });
      (function (el) { an.onfinish = function () { el.remove(); }; })(s);
    }
  };
  // loop com delta-time; devolve função para parar
  SR.loop = function (fn) {
    var raf, last = performance.now(), on = true;
    function f(t) { if (!on) return; var dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt); raf = requestAnimationFrame(f); }
    raf = requestAnimationFrame(f);
    return function () { on = false; cancelAnimationFrame(raf); };
  };
  return SR;
})();
