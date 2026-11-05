/* Candy Match — troque doces vizinhos e junte 3 ou mais iguais. */
SR.games.match = { start: function (root, ctx) {
  var N = 7, GX0 = 66, GY0 = 455, CW = 114.8, CH = 112.7;           // medidas da grade na arte (941x1672)
  var GOAL = ctx.goal || 600, MOVES = ctx.moves || 22;               // meta e jogadas: ajuste aqui
  var SPR = [ { n: "choco", w: 90 }, { n: "cupcake", w: 92 }, { n: "estrela", w: 92 }, { n: "gominha", w: 90 }, { n: "bala_ovo", w: 98 }, { n: "embrulho", w: 100 } ];
  var stage = document.getElementById("stage");
  var grid, busy = true, sel = null, down = null, score = 0, moves = MOVES, lastInput = Date.now(), over = false, hintTimer, uid = 0, timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  root.innerHTML = "";
  root.appendChild(Object.assign(SR.el("img", "bg"), { src: SR.asset("bg_match"), alt: "" }));
  SR.progress(root, ctx.index);
  var say = SR.say(root, "Mestre Bala", "Troque 2 doces vizinhos e <em>junte 3 ou mais iguais</em>!");
  var board = SR.el("div", "abs");
  board.style.cssText = "left:" + SR.pctX(GX0) + ";top:" + SR.pctY(GY0) + ";width:" + SR.pctX(N * CW) + ";height:" + SR.pctY(N * CH) + ";overflow:hidden;touch-action:none";
  root.appendChild(board);
  var sc = SR.pill(root, '<span>⭐</span><b id="mScore">0</b><span class="meter"><i id="mMeter"></i></span>', "left:calc(5cqw + var(--cut,0cqw));top:" + SR.pctY(1330));
  var mv = SR.pill(root, 'Jogadas <b id="mMoves">' + MOVES + "</b>", "right:calc(5cqw + var(--cut,0cqw));top:" + SR.pctY(1330));
  sc.querySelector(".meter").style.width = "22cqw";

  /* ----- lógica pura (matriz de tipos) ----- */
  function runs(T) {
    var hit = {}, longest = 0, r, c, k, t, j;
    for (r = 0; r < N; r++) { c = 0; while (c < N) { t = T[r][c]; if (t == null) { c++; continue; } k = c; while (k + 1 < N && T[r][k + 1] === t) k++; if (k - c + 1 >= 3) { for (j = c; j <= k; j++) hit[r * N + j] = 1; longest = Math.max(longest, k - c + 1); } c = k + 1; } }
    for (c = 0; c < N; c++) { r = 0; while (r < N) { t = T[r][c]; if (t == null) { r++; continue; } k = r; while (k + 1 < N && T[k + 1][c] === t) k++; if (k - r + 1 >= 3) { for (j = r; j <= k; j++) hit[j * N + c] = 1; longest = Math.max(longest, k - r + 1); } r = k + 1; } }
    return { cells: Object.keys(hit).map(Number), longest: longest };
  }
  function findMove(T) {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var d = [[0, 1], [1, 0]];
      for (var i = 0; i < 2; i++) {
        var r2 = r + d[i][0], c2 = c + d[i][1]; if (r2 >= N || c2 >= N) continue;
        var a = T[r][c], b = T[r2][c2]; T[r][c] = b; T[r2][c2] = a;
        var ok = runs(T).cells.length > 0; T[r][c] = a; T[r2][c2] = b;
        if (ok) return [[r, c], [r2, c2]];
      }
    }
    return null;
  }
  function genTypes() {
    var T, tries = 0;
    do {
      T = [];
      for (var r = 0; r < N; r++) { T[r] = []; for (var c = 0; c < N; c++) {
        var opts = SR.shuffle([0, 1, 2, 3, 4, 5]);
        for (var i = 0; i < opts.length; i++) { var t = opts[i];
          if (c >= 2 && T[r][c - 1] === t && T[r][c - 2] === t) continue;
          if (r >= 2 && T[r - 1][c] === t && T[r - 2][c] === t) continue;
          T[r][c] = t; break; } } }
      tries++;
    } while (!findMove(T) && tries < 50);
    return T;
  }
  function typesOf() { return grid.map(function (row) { return row.map(function (t) { return t ? t.type : null; }); }); }

  /* ----- peças na tela ----- */
  function makeTile(type, r, c) {
    var t = { id: ++uid, type: type, r: r, c: c };
    var e = SR.el("div", "tile"); e.style.width = (100 / N) + "%"; e.style.height = (100 / N) + "%";
    e.style.setProperty("--tw", SPR[type].w + "%");
    var im = new Image(); im.src = SR.asset(SPR[type].n); im.alt = ""; e.appendChild(im);
    t.el = e; board.appendChild(e); put(t); return t;
  }
  function put(t, rowOverride) { t.el.style.left = (t.c / N * 100) + "%"; t.el.style.top = ((rowOverride != null ? rowOverride : t.r) / N * 100) + "%"; }
  function center(r, c) { return { x: GX0 + (c + 0.5) * CW, y: GY0 + (r + 0.5) * CH }; }
  function buildBoard() {
    board.innerHTML = ""; var T = genTypes(); grid = [];
    for (var r = 0; r < N; r++) { grid[r] = []; for (var c = 0; c < N; c++) grid[r][c] = makeTile(T[r][c], r, c); }
  }
  function cellAt(ev) {
    var b = board.getBoundingClientRect(), c = Math.floor((ev.clientX - b.left) / b.width * N), r = Math.floor((ev.clientY - b.top) / b.height * N);
    return (r >= 0 && r < N && c >= 0 && c < N) ? { r: r, c: c } : null;
  }
  function clearHint() { board.querySelectorAll(".hint").forEach(function (e) { e.classList.remove("hint"); }); }
  function select(cell) { clearSel(); sel = cell; if (cell) grid[cell.r][cell.c].el.classList.add("sel"); }
  function clearSel() { if (sel && grid[sel.r][sel.c]) grid[sel.r][sel.c].el.classList.remove("sel"); sel = null; }
  function hud() {
    root.querySelector("#mScore").textContent = score; root.querySelector("#mMoves").textContent = moves;
    root.querySelector("#mMeter").style.width = Math.min(100, score / GOAL * 100) + "%";
    mv.classList.toggle("warn", moves <= 4);
  }

  /* ----- jogadas ----- */
  function swapTiles(a, b) {
    var ta = grid[a.r][a.c], tb = grid[b.r][b.c];
    grid[a.r][a.c] = tb; grid[b.r][b.c] = ta;
    ta.r = b.r; ta.c = b.c; tb.r = a.r; tb.c = a.c; put(ta); put(tb);
  }
  function trySwap(a, b) {
    busy = true; clearSel(); clearHint(); lastInput = Date.now(); SR.sfx.swap();
    swapTiles(a, b);
    later(function () {
      if (runs(typesOf()).cells.length) { moves--; hud(); resolve(1); }
      else { SR.sfx.bad(); swapTiles(a, b); later(function () { busy = false; }, 240); }
    }, 240);
  }
  function resolve(chain) {
    var res = runs(typesOf());
    if (!res.cells.length) return afterCascade();
    var mult = 1 + 0.5 * (chain - 1), pts = Math.round(res.cells.length * 10 * mult) + (res.longest >= 5 ? 40 : res.longest === 4 ? 20 : 0);
    score += pts; hud(); SR.sfx.pop(chain);
    var cx = 0, cy = 0;
    res.cells.forEach(function (i) {
      var r = Math.floor(i / N), c = i % N, t = grid[r][c], p = center(r, c); cx += p.x; cy += p.y;
      t.el.classList.add("pop"); SR.sparks(root, p.x, p.y, 5); grid[r][c] = null;
      (function (el) { later(function () { el.remove(); }, 290); })(t.el);
    });
    SR.toast(root, "+" + pts + (chain > 1 ? "  Combo x" + chain + "!" : ""), cx / res.cells.length, Math.max(200, cy / res.cells.length - 60));
    later(function () { gravity(); later(function () { resolve(chain + 1); }, 520); }, 300);
  }
  function gravity() {
    for (var c = 0; c < N; c++) {
      var col = [], r;
      for (r = N - 1; r >= 0; r--) if (grid[r][c]) col.push(grid[r][c]);
      var miss = N - col.length;
      for (r = N - 1; r >= 0; r--) {
        var t;
        if (col.length) { t = col.shift(); }
        else { t = makeTile(Math.floor(Math.random() * 6), r, c); t.r = r; put(t, r - miss - 0); t.el.style.top = ((r - miss) / N * 100) + "%"; }
        t.r = r; t.c = c; grid[r][c] = t; t.el.classList.add("drop");
      }
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c]) put(grid[r][c]);
      later(function () { board.querySelectorAll(".drop").forEach(function (e) { e.classList.remove("drop"); }); }, 480);
    }); });
  }
  function afterCascade() {
    hud();
    if (score >= GOAL) return win();
    if (moves <= 0) return lose();
    if (!findMove(typesOf())) {
      SR.toast(root, "Embaralhando!", 470, 1000);
      var T = genTypes();                                                  // novo tabuleiro sem combinações prontas e com jogada possível
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var t = grid[r][c]; t.type = T[r][c]; t.el.querySelector("img").src = SR.asset(SPR[t.type].n); t.el.style.setProperty("--tw", SPR[t.type].w + "%"); }
    }
    say.set(score > 0 ? "Muito bem! Faça <em>combos em cadeia</em> para ganhar mais pontos." : say.querySelector("p").innerHTML);
    busy = false; lastInput = Date.now();
  }

  /* ----- fim de jogo ----- */
  function win() {
    over = true; busy = true; SR.sfx.win(); SR.sparks(root, 470, 800, 26);
    later(function () {
      SR.card(root, { icon: "🔎", badge: "★ Pista " + (ctx.index + 1) + " de 3 ★", title: "Que pena!", rays: true,
        extra: '<div class="stats"><span>⭐ ' + score + " pontos</span></div>", text: "O envelope não estava entre os doces… mas achamos uma pista: ele foi levado para a <b>fábrica</b>! Vamos atrás?", button: "Seguir a pista",
        onClick: function () { ctx.onWin && ctx.onWin({ game: "match", score: score, moves: moves }); } });
    }, 700);
  }
  function lose() {
    over = true; busy = true; SR.sfx.lose();
    later(function () {
      SR.card(root, { icon: "😅", badge: "Quase lá!", title: "Acabaram as jogadas", extra: '<div class="stats"><span>⭐ ' + score + " / " + GOAL + "</span></div>",
        text: "Ainda não deu para achar a pista. Tente de novo, você consegue!", button: "Tentar de novo", onClick: function () { destroy(); SR.games.match.start(root, Object.assign({}, ctx, { skipBriefing: true })); } });
    }, 500);
  }

  /* ----- entrada: arrastar para o lado ou tocar em dois doces ----- */
  function onDown(ev) {
    if (busy || over) return; SR.audioInit(); lastInput = Date.now(); clearHint();
    var cell = cellAt(ev); if (!cell) return; down = { r: cell.r, c: cell.c, x: ev.clientX, y: ev.clientY, moved: false };
  }
  function onMove(ev) {
    if (!down || busy || over) return;
    var dx = ev.clientX - down.x, dy = ev.clientY - down.y, thr = board.getBoundingClientRect().width / N * 0.35;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < thr) return;
    var a = { r: down.r, c: down.c }, b = Math.abs(dx) > Math.abs(dy) ? { r: a.r, c: a.c + (dx > 0 ? 1 : -1) } : { r: a.r + (dy > 0 ? 1 : -1), c: a.c };
    down = null; if (b.r < 0 || b.r >= N || b.c < 0 || b.c >= N) return; trySwap(a, b);
  }
  function onUp() {
    if (!down || busy || over) { down = null; return; }
    var cell = { r: down.r, c: down.c }; down = null; SR.sfx.tap();
    if (!sel) return select(cell);
    if (sel.r === cell.r && sel.c === cell.c) return clearSel();
    if (Math.abs(sel.r - cell.r) + Math.abs(sel.c - cell.c) === 1) { var a = sel; return trySwap(a, cell); }
    select(cell);
  }
  board.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
  hintTimer = setInterval(function () {
    if (busy || over || Date.now() - lastInput < 7000) return;
    var m = findMove(typesOf()); if (!m) return; clearHint();
    grid[m[0][0]][m[0][1]].el.classList.add("hint"); grid[m[1][0]][m[1][1]].el.classList.add("hint");
  }, 1000);

  function destroy() {
    clearInterval(hintTimer); timers.forEach(clearTimeout);
    board.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
  }

  buildBoard(); hud();
  function begin() { busy = false; lastInput = Date.now(); }
  if (ctx.skipBriefing) begin();
  else SR.card(root, { icon: "🍬", badge: "Procurando o envelope", title: "Será que está aqui?",
    text: "O envelope pode estar escondido entre os doces! Junte <b>3 ou mais iguais</b> e faça <b>" + GOAL + " pontos</b> em " + MOVES + " jogadas para revirar tudo e achar uma pista.", button: "Procurar!", onClick: begin });
  return { destroy: destroy, debug: { get grid() { return grid; }, typesOf: typesOf, findMove: findMove, trySwap: trySwap, get score() { return score; }, get moves() { return moves; }, get busy() { return busy; } } };
} };
