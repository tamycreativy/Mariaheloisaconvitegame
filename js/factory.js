/* Sweet Factory — arraste cada doce da esteira para a caixa da mesma cor. */
SR.games.factory = { start: function (root, ctx) {
  var GOAL = ctx.goal || 15, TIME = ctx.time || 60, SPEED = 75;            // meta, segundos, velocidade das esteiras (px da arte/s)
  var BELTS = [                                                           // caminhos das esteiras (espaço 941x1672)
    [[262, 575], [245, 640], [165, 700], [105, 760], [118, 810], [160, 850]],
    [[470, 560], [470, 700], [470, 850]],
    [[645, 600], [705, 660], [785, 715], [800, 770], [775, 820], [775, 850]]
  ];
  var BOXES = [ { sp: "bala_ovo", img: "caixa_azul", x: 170, y: 1130, label: "azul" }, { sp: "embrulho", img: "caixa_rosa", x: 470, y: 1130, label: "rosa" }, { sp: "estrela", img: "caixa_amarela", x: 770, y: 1130, label: "amarela" } ];
  var SIZE = { bala_ovo: 120, embrulho: 125, estrela: 105 };
  var timers = [], stopLoop, over = false, running = false, score = 0, left = TIME, spawnT = 0, cands = [], dragging = null, uid = 0;
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  root.innerHTML = "";
  root.appendChild(Object.assign(SR.el("img", "bg"), { src: SR.asset("bg_fabrica"), alt: "" }));
  SR.progress(root, ctx.index);
  var say = SR.say(root, "Chef Taffyta", "Arraste cada doce para a <em>caixa da mesma cor</em>!");
  var layer = SR.el("div", "abs"); layer.style.cssText = "inset:0;z-index:10"; root.appendChild(layer);
  var boxEls = BOXES.map(function (b) {
    var z = SR.el("div", "abs"); z.style.cssText = "z-index:9;left:" + SR.pctX(b.x) + ";top:" + SR.pctY(b.y) + ";width:" + SR.cq(270) + ";transform:translate(-50%,-50%);transition:filter .15s,transform .15s;pointer-events:none";
    z.innerHTML = '<img src="' + SR.asset(b.img) + '" alt="" style="width:100%;display:block;filter:drop-shadow(0 ' + SR.cq(14) + ' ' + SR.cq(10) + ' #4a1d3a77)">';
    root.appendChild(z);
    var n = SR.el("div", "boxn", '<img src="' + SR.asset(b.sp) + '" alt="">'); n.style.left = SR.pctX(b.x); n.style.top = SR.pctY(b.y + 105); root.appendChild(n); b.n = n; b.z = z; return z;
  });
  var pT = SR.pill(root, '⏱ <b id="fT">' + TIME + "</b>", "left:calc(5cqw + var(--cut,0cqw));top:" + SR.pctY(1330));
  var pS = SR.pill(root, '🍬 <b id="fS">0</b>/' + GOAL, "right:calc(5cqw + var(--cut,0cqw));top:" + SR.pctY(1330));

  function pathLen(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  BELTS.forEach(function (p) { p.L = pathLen(p); });
  function along(p, d) {
    for (var i = 1; i < p.length; i++) {
      var seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= seg) { var t = d / seg; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]; }
      d -= seg;
    }
    return p[p.length - 1].slice();
  }
  function place(c) {
    var s = SIZE[BOXES[c.kind].sp] * (c.scale || 1);
    c.el.style.left = SR.pctX(c.x); c.el.style.top = SR.pctY(c.y); c.el.style.width = SR.cq(s);
  }
  function spawn() {
    var b = Math.floor(Math.random() * 3), k = Math.floor(Math.random() * 3);
    var e = SR.el("div", "cand", '<img src="' + SR.asset(BOXES[k].sp) + '" alt="">');
    var c = { id: ++uid, belt: b, kind: k, d: 0, el: e, x: 0, y: 0, scale: 0.6, free: false };
    var p = along(BELTS[b], 0); c.x = p[0]; c.y = p[1]; place(c); layer.appendChild(e); cands.push(c);
    e.addEventListener("pointerdown", function (ev) { if (!running || over || c.gone) return; SR.audioInit(); ev.preventDefault(); grab(c, ev); });
  }
  function remove(c) { c.gone = true; c.el.remove(); cands = cands.filter(function (x) { return x !== c; }); }
  function grab(c, ev) { dragging = c; c.free = true; c.el.classList.add("drag"); c.scale = 1.15; move(ev); SR.sfx.tap(); }
  function boxAt(c) {
    for (var i = 0; i < 3; i++) if (Math.abs(c.x - BOXES[i].x) < 150 && Math.abs(c.y - BOXES[i].y) < 130) return i;
    return -1;
  }
  function move(ev) {
    if (!dragging) return; var a = SR.toArt(document.getElementById("stage"), ev);
    dragging.x = a.x; dragging.y = a.y - 70; place(dragging);                 // doce fica acima do dedo
    var h = boxAt(dragging); boxEls.forEach(function (z, i) { z.style.filter = i === h ? "brightness(1.18) drop-shadow(0 0 " + SR.cq(18) + " #fff)" : ""; z.style.transform = "translate(-50%,-50%) scale(" + (i === h ? 1.07 : 1) + ")"; });
  }
  function release() {
    if (!dragging) return; var c = dragging; dragging = null; c.el.classList.remove("drag");
    boxEls.forEach(function (z) { z.style.filter = ""; z.style.transform = "translate(-50%,-50%)"; });
    var h = boxAt(c);
    if (h === c.kind) {
      score++; SR.sfx.coin(); SR.sparks(root, BOXES[h].x, BOXES[h].y, 12); SR.toast(root, "+1", BOXES[h].x, BOXES[h].y - 120); hud();
      c.el.classList.add("fall"); c.el.style.left = SR.pctX(BOXES[h].x); c.el.style.top = SR.pctY(BOXES[h].y - 20); c.el.style.transform = "translate(-50%,-50%) scale(.2)"; c.el.style.opacity = 0;
      c.gone = true; cands = cands.filter(function (x) { return x !== c; }); later(function () { c.el.remove(); }, 380);
      if (score >= GOAL) win();
    } else if (h >= 0) {                                                   // caixa errada: -3s e o doce volta para a esteira
      SR.sfx.bad(); left = Math.max(0, left - 3); SR.toast(root, "-3s  Caixa errada!", BOXES[h].x, BOXES[h].y - 120); hud();
      boxEls[h].animate([{ transform: "translate(-50%,-50%)" }, { transform: "translate(-56%,-50%)" }, { transform: "translate(-44%,-50%)" }, { transform: "translate(-50%,-50%)" }], { duration: 300 }); back(c);
    } else back(c);
  }
  function back(c) { c.free = false; c.scale = 0.9; var best = 1e9, bd = 0, p = BELTS[c.belt], i;
    for (i = 0; i <= 40; i++) { var q = along(p, p.L * i / 40), dd = Math.hypot(q[0] - c.x, q[1] - c.y); if (dd < best) { best = dd; bd = p.L * i / 40; } }
    c.d = bd; var q2 = along(p, bd); c.x = q2[0]; c.y = q2[1]; place(c); }
  function onMove(ev) { move(ev); }
  window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", release); window.addEventListener("pointercancel", release);

  function hud() { root.querySelector("#fT").textContent = Math.ceil(left); root.querySelector("#fS").textContent = score; pT.classList.toggle("warn", left <= 10); }
  function tick(dt) {
    if (!running || over) return;
    left -= dt; if (left <= 0) { left = 0; hud(); return lose(); }
    spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = SR.rand(1.0, 1.7) * (1 - 0.3 * (1 - left / TIME)); }
    cands.slice().forEach(function (c) {
      if (c.free || c.gone) return;
      c.d += SPEED * dt; var p = BELTS[c.belt]; c.scale = SR.clamp(0.6 + 0.4 * c.d / p.L, 0.6, 1);
      if (c.d >= p.L) {                                                    // chegou ao fim sem ser separado: cai e some
        c.gone = true; cands = cands.filter(function (x) { return x !== c; }); c.el.classList.add("fall"); c.el.style.top = SR.pctY(c.y + 160); c.el.style.opacity = 0; later(function () { c.el.remove(); }, 380); return;
      }
      var q = along(p, c.d); c.x = q[0]; c.y = q[1]; place(c);
    });
    hud();
  }

  function cleanup() { running = false; stopLoop && stopLoop(); timers.forEach(clearTimeout); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release); }
  function win() {
    over = true; cleanup(); SR.sfx.win(); SR.sparks(root, 470, 800, 26);
    later(function () { SR.card(root, { icon: "🔎", badge: "★ Pista " + (ctx.index + 1) + " de 3 ★", title: "Ainda não!", rays: true,
      extra: '<div class="stats"><span>🍬 ' + score + " doces</span><span>⏱ " + Math.ceil(left) + "s sobrando</span></div>", text: "O envelope também não estava na fábrica… mas uma etiqueta aponta para a <b>pista de corrida</b>! Corra atrás dele!", button: "Seguir a pista",
      onClick: function () { ctx.onWin && ctx.onWin({ game: "factory", score: score }); } }); }, 600);
  }
  function lose() {
    over = true; cleanup(); SR.sfx.lose();
    later(function () { SR.card(root, { icon: "😅", badge: "Quase lá!", title: "O tempo acabou", extra: '<div class="stats"><span>🍬 ' + score + " / " + GOAL + "</span></div>",
      text: "Os doces se misturaram e o envelope sumiu de vista. Tente de novo!", button: "Tentar de novo", onClick: function () { SR.games.factory.start(root, Object.assign({}, ctx, { skipBriefing: true })); } }); }, 400);
  }
  function begin() { SR.countdown(root, function () { running = true; stopLoop = SR.loop(tick); spawn(); spawnT = 1.1; }); }
  hud();
  if (ctx.skipBriefing) begin();
  else SR.card(root, { icon: "🏭", badge: "Seguindo a pista", title: "Sweet Factory",
    text: "A pista levou até a fábrica! O envelope pode ter ido parar nas esteiras. Separe <b>" + GOAL + " doces</b> em " + TIME + " segundos, cada um na caixa da <b>sua cor</b>, para procurar.", button: "Vamos!", onClick: begin });
  return { destroy: cleanup, debug: { get cands() { return cands; }, BOXES: BOXES, get score() { return score; }, release: release } };
} };
