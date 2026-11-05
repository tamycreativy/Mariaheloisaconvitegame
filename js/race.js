/* Candy Kart Race — deslize para trocar de faixa, desvie dos obstáculos, pegue doces e cruze a linha de chegada. */
SR.games.race = { start: function (root, ctx) {
  var HORIZON = 574, VX = 470, CAR_Y = 1470, LANE = 320;                    // geometria da pista na arte (941x1672)
  var LENGTH = ctx.length || 21000, BASE = 920, FAR = 5200, K = 1000;       // comprimento, velocidade (u/s), alcance e perspectiva
  var OBST = [ { n: "poca_rosa", w: 330, slow: 0.55, crash: false }, { n: "poca_choco", w: 330, slow: 0.55, crash: false }, { n: "rolo", w: 300, slow: 0.35, crash: true }, { n: "muro", w: 330, slow: 0.3, crash: true } ];
  var CANDY = [ { n: "estrela", w: 110 }, { n: "gominha", w: 100 }, { n: "bala_ovo", w: 120 }, { n: "embrulho", w: 125 }, { n: "cupcake", w: 90 }, { n: "choco", w: 105 } ];
  var timers = [], stopLoop, running = false, over = false, dist = 0, speedMul = 1, slowT = 0, candies = 0, hits = 0, lane = 1, carX = 0, targetX = 0, items = [], dashes = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function sx(off, s) { return VX + off * s; }
  function sy(s) { return HORIZON + (CAR_Y - HORIZON) * s; }
  function scaleOf(d) { return 1 / (1 + Math.max(d, -K * 0.6) / K); }

  root.innerHTML = "";
  root.appendChild(Object.assign(SR.el("img", "bg"), { src: SR.asset("bg_corrida"), alt: "" }));
  SR.progress(root, ctx.index);
  var say = SR.say(root, "Piloto Vanellope", "Deslize para os lados e <em>desvie dos obstáculos</em>. Pegue os doces!");
  var layer = SR.el("div", "abs"); layer.style.cssText = "inset:0;overflow:hidden"; root.appendChild(layer);
  var flash = SR.el("div", "flash"); root.appendChild(flash);
  var car = SR.el("div"); car.id = "carro"; car.innerHTML = '<img src="' + SR.asset("carro") + '" alt="">'; car.style.width = SR.cq(270); layer.appendChild(car);
  var pC = SR.pill(root, '🍬 <b id="rC">0</b>', "left:5cqw;top:" + SR.pctY(1570));
  var pP = SR.pill(root, '🏁 <span class="meter" style="width:34cqw"><i id="rM"></i></span>', "right:5cqw;top:" + SR.pctY(1570));

  /* ----- pista: obstáculos e doces ----- */
  (function build() {
    var z = 2200, last = -1;
    while (z < LENGTH - 2600) {
      var free = [0, 1, 2], nBlock = Math.random() < 0.35 ? 2 : 1, blocked = SR.shuffle(free.slice()).slice(0, nBlock), kind = SR.pick(OBST);
      blocked.forEach(function (l) { items.push({ t: "o", z: z, lane: l, def: kind }); });
      free = free.filter(function (l) { return blocked.indexOf(l) < 0; });
      var cl = SR.pick(free), def = SR.pick(CANDY);
      for (var i = 0; i < 3; i++) items.push({ t: "c", z: z + 500 + i * 190, lane: cl, def: def });
      z += SR.rand(1250, 1650);
    }
    items.push({ t: "f", z: LENGTH });
    items.forEach(function (it) {
      var e = SR.el("div", "obj" + (it.t === "f" ? " fin" : ""));
      if (it.t === "f") e.innerHTML = "<u class=\"pole l\"></u><u class=\"pole r\"></u><i></i><b>CHEGADA</b>"; else { e.innerHTML = '<img src="' + SR.asset(it.def.n) + '" alt="">'; if (it.t === "c") e.classList.add("spin"); }
      e.style.display = "none"; layer.appendChild(e); it.el = e; it.done = false;
    });
    for (var k = 0; k < 0; k++) for (var j = 0; j < 12; j++) { var d = SR.el("div", "obj dash", "<i></i>"); d.style.setProperty("--c", ["#ff3d9a", "#ffd23f", "#14c9cf"][j % 3]); layer.appendChild(d); dashes.push({ el: d, side: k ? 1 : -1, j: j }); }
  })();

  function setLane(l) { l = SR.clamp(l, 0, 2); if (l !== lane) { lane = l; SR.sfx.whoosh(); } targetX = (lane - 1) * LANE; }

  function draw() {
    var s1 = 1; car.style.left = SR.pctX(sx(carX, s1)); car.style.top = SR.pctY(CAR_Y);
    car.style.transform = "translate(-50%,-100%) rotate(" + SR.clamp((targetX - carX) / 40, -8, 8) + "deg)";
    items.forEach(function (it) {
      var d = it.z - dist, e = it.el;
      if (it.done || d > FAR || d < -K * 0.6) { e.style.display = "none"; return; }
      var s = scaleOf(d), y = sy(s); e.style.display = "block"; e.style.opacity = SR.clamp((FAR - d) / 700, 0, 1);
      e.style.zIndex = Math.min(14, Math.floor(s * 10));
      if (it.t === "f") { e.style.left = SR.pctX(VX); e.style.top = SR.pctY(y); e.style.width = SR.cq(1000 * s); e.style.height = SR.cq(80 * s); e.style.fontSize = SR.cq(10 * s); e.style.setProperty("--u", SR.cq(10 * s)); return; }
      e.style.left = SR.pctX(sx((it.lane - 1) * LANE, s)); e.style.top = SR.pctY(y); e.style.width = SR.cq(it.def.w * s);
    });
    var gap = 260, base = dist % gap;
    dashes.forEach(function (o) {
      var d = o.j * gap - base + 60, s = scaleOf(d), e = o.el;
      if (d < -K * 0.5 || d > FAR) { e.style.display = "none"; return; }
      e.style.display = "block"; e.style.left = SR.pctX(sx(o.side * LANE / 2, s)); e.style.top = SR.pctY(sy(s)); e.style.width = SR.cq(36 * s); e.style.height = SR.cq(120 * s); e.style.opacity = SR.clamp((FAR - d) / 900, 0, 0.9);
    });
  }

  function crash(def) {
    hits++; SR.sfx.crash(); speedMul = def.slow; slowT = 1.1;
    flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
    root.classList.remove("shake"); void root.offsetWidth; root.classList.add("shake");
  }
  function tick(dt) {
    if (!running || over) return;
    if (slowT > 0) { slowT -= dt; if (slowT <= 0) speedMul = 1; } else if (speedMul < 1) speedMul = Math.min(1, speedMul + dt);
    var STOP = LENGTH - 60, left = STOP - dist, sp = BASE * (1 + 0.25 * dist / LENGTH) * speedMul; if (left < 1500) sp *= Math.max(0.12, left / 1500); dist = Math.min(STOP, dist + sp * dt);
    carX += (targetX - carX) * Math.min(1, dt * 12);
    items.forEach(function (it) {
      if (it.done || it.t === "f") return; var d = it.z - dist;
      if (d < -60 || d > 50) { if (d < -60) { it.done = true; } return; }
      if (Math.abs((it.lane - 1) * LANE - carX) > LANE * 0.5) return;
      it.done = true;
      if (it.t === "c") { candies++; SR.sfx.coin(); var p = { x: sx(carX, 1), y: CAR_Y - 140 }; SR.sparks(root, p.x, p.y, 8); SR.toast(root, "+1", p.x, p.y - 80); root.querySelector("#rC").textContent = candies; }
      else crash(it.def);
    });
    root.querySelector("#rM").style.width = Math.min(100, dist / (LENGTH - 60) * 100) + "%";
    if (dist > 2000) say.classList.add("hide");
    draw();
    if (dist >= LENGTH - 61) win();
  }

  /* ----- controles: deslizar, tocar nos lados ou setas do teclado ----- */
  var pd = null;
  function down(ev) { if (!running || over) return; SR.audioInit(); pd = { x: ev.clientX, y: ev.clientY, used: false }; }
  function mv(ev) { if (!pd || pd.used) return; var dx = ev.clientX - pd.x; if (Math.abs(dx) > 28) { setLane(lane + (dx > 0 ? 1 : -1)); pd.x = ev.clientX; } }
  function up(ev) {
    if (!pd) return; var st = document.getElementById("stage").getBoundingClientRect(), moved = Math.abs(ev.clientX - pd.x) > 6 || pd.used; var sx0 = pd.x; pd = null;
    if (!moved && Math.abs(ev.clientX - sx0) < 6 && ev.clientX >= st.left && ev.clientX <= st.right) { var r = (ev.clientX - st.left) / st.width; if (r < 0.4) setLane(lane - 1); else if (r > 0.6) setLane(lane + 1); }
  }
  function key(ev) { if (ev.key === "ArrowLeft") setLane(lane - 1); else if (ev.key === "ArrowRight") setLane(lane + 1); }
  var stageEl = document.getElementById("stage");
  stageEl.addEventListener("pointerdown", down); window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("keydown", key);

  function cleanup() { running = false; stopLoop && stopLoop(); timers.forEach(clearTimeout); stageEl.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", key); }
  function win() {
    over = true; running = false; cleanup(); SR.sfx.win(); SR.sparks(root, 470, 900, 28);
    later(function () { SR.card(root, { icon: "✨", badge: "★ Última pista ★", title: "Tem algo ali!", rays: true,
      extra: '<div class="stats"><span>🍬 ' + candies + " doces</span><span>💥 " + hits + " batidas</span></div>", text: "Tem um brilho bem na linha de chegada… Será que é ele?", button: "Ver o que é",
      onClick: function () { ctx.onWin && ctx.onWin({ game: "race", candies: candies, hits: hits }); } }); }, 800);
  }
  function begin() { setLane(1); carX = 0; draw(); SR.countdown(root, function () { running = true; stopLoop = SR.loop(tick); }); }
  carX = 0; draw();
  if (ctx.skipBriefing) begin();
  else SR.card(root, { icon: "🏎️", badge: "Última pista", title: "Candy Kart Race",
    text: "A última pista aponta para a pista de corrida! Deslize para trocar de faixa, <b>desvie</b> dos obstáculos e pegue <b>doces</b> até a linha de chegada para encontrar o envelope.", button: "Vamos!", onClick: begin });
  return { destroy: cleanup, debug: { get dist() { return dist; }, get candies() { return candies; }, get hits() { return hits; }, setLane: setLane, get lane() { return lane; }, set dist(v) { dist = v; } } };
} };
