/* Sweet Race — controle do fluxo: capa → abertura → 3 jogos → envelope → informações → presentes */
(function () {
  /* ===== CONFIGURE AQUI ===== */
  SR.config.rsvp = { whatsapp: "" };               // número com DDI+DDD, só dígitos. Ex.: "5585999999999" (as confirmações chegam por WhatsApp)
  SR.config.local = { nome: "Buffet Encanto Mágico", mapa: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Buffet Encanto Mágico") };  // troque "mapa" pelo link exato do endereço
  SR.config.festa = "Maria Heloísa — 8 anos · 15 de dezembro, 17:00";
  SR.config.music = "assets/musica.mp3";
  var ORDER = ["match", "factory", "race"];
  /* ========================== */
  var $ = function (id) { return document.getElementById(id); }, stage = $("stage"), cur = "cover", game = null;
  // tela cheia (vídeos e jogos): se a tela é mais alta que 9:16, o palco enche a altura inteira e alarga um pouco (corta as laterais)
  function layout() {
    var W = window.innerWidth, H = window.innerHeight, Hc = W * 16 / 9, fill = (cur === "cover" || cur === "video" || cur === "game" || cur === "env") && H > Hc + 2;
    stage.classList.toggle("fill", fill);
    if (fill) { var sy = H / Hc, sx = 1 + (sy - 1) * 0.5; stage.style.setProperty("--wa", (W * sx) + "px"); stage.style.setProperty("--ha", H + "px"); stage.style.setProperty("--cut", ((1 - 1 / sx) / 2 * 100) + "cqw"); }
    else stage.style.setProperty("--cut", "0cqw");
  }
  window.addEventListener("resize", layout); window.addEventListener("orientationchange", layout);
  function amb(n) { document.querySelector("#amb .t").style.backgroundImage = "url(assets/amb_" + n + "_t.png)"; document.querySelector("#amb .b").style.backgroundImage = "url(assets/amb_" + n + "_b.png)"; }
  function show(name) {
    if (name !== "game") amb(name === "cover" || name === "video" ? "capa" : name === "env" || name === "info" || name === "gifts" ? "info" : "capa");
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.toggle("on", s.id === "s-" + name); });
    SR.musicLevel(name === "video" || name === "game" ? "low" : "normal"); cur = name; layout(); 
  }
  $("snd").addEventListener("click", function () { SR.audioInit(); SR.setMuted(!SR.state.muted); });

  function play(v, tapBtn, onEnd, onStart) {
    v.muted = SR.state.muted; v.currentTime = 0; var ended = false;
    v.onended = function () { if (!ended) { ended = true; onEnd(); } };
    v.onplaying = function () { tapBtn.style.display = "none"; onStart && onStart(); };
    var p = v.play(); if (p && p.catch) p.catch(function () { tapBtn.style.display = "flex"; });
    tapBtn.onclick = function () { tapBtn.style.display = "none"; v.play(); };
  }
  function startGame(i) {
    if (game && game.destroy) game.destroy();
    if (i >= ORDER.length) return found();
    show("game"); var root = $("s-game"); root.innerHTML = "";
    amb({ match: "match", factory: "fabrica", race: "corrida" }[ORDER[i]]);
    game = SR.games[ORDER[i]].start(root, { index: i, onWin: function () { startGame(i + 1); } });
  }
  function found() {
    amb("capa"); show("game"); var root = $("s-game"); root.innerHTML = '<img class="bg" src="assets/bg_capa.webp" alt="">';
    SR.musicLevel("normal"); SR.sfx.win(); SR.card(root, { icon: "💌", badge: "Missão cumprida", title: "Você conseguiu!", rays: true, text: "Achamos o convite! Achamos o envelope da Maria Heloísa.", button: "Abrir envelope", onClick: envelope });
  }
  function envelope() {
    show("env"); var v = $("envelope");
    play(v, $("tap2"), function () { info(true); });
  }
  function info(fromVideo) {
    show("info"); var s = $("s-info"); s.classList.remove("fade"); void s.offsetWidth; s.classList.add("fade");
    if (fromVideo) $("s-env").classList.add("on");   // mantém o último quadro do envelope atrás da página
    $("s-info").style.zIndex = 2;
  }
  var info$ = $("s-info");
  function localCard() {
    SR.card(info$, { icon: "📍", badge: "Local da festa", title: SR.config.local.nome, text: "Dia 15 de dezembro, às 17:00.<br>Te esperamos lá!", button: "Abrir no mapa", button2: "Fechar", top: "30cqw",
      onClick: function () { window.open(SR.config.local.mapa, "_blank", "noopener"); } });
  }
  function rsvpCard() {
    var dim = SR.el("div", "dim"), c = SR.el("div", "win"), going = true, qty = 1;
    c.style.top = "17cqw";
    c.innerHTML = '<div class="in"><span class="peek">💌</span><h2>Confirmar presença</h2>' +
      '<label class="lbl" for="rsvpNome">Seu nome</label><input id="rsvpNome" class="inp" type="text" maxlength="60" autocomplete="name" placeholder="Nome e sobrenome">' +
      '<div class="seg"><button type="button" class="on" data-v="1">Eu vou! 🎉</button><button type="button" data-v="0">Não posso</button></div>' +
      '<div class="qty" id="rsvpQ"><span class="lbl">Quantas pessoas vão?</span><button type="button" id="qm" aria-label="menos">−</button><b id="qn">1</b><button type="button" id="qp" aria-label="mais">+</button></div>' +
      '<p class="err" id="rsvpErr" hidden>Escreva seu nome para confirmar.</p>' +
      '<button class="go" id="rsvpSend" type="button">Enviar</button><br><button class="go sec" id="rsvpX" type="button">Cancelar</button></div>';
    info$.appendChild(dim); info$.appendChild(c);
    function close() { dim.remove(); c.remove(); }
    c.querySelectorAll(".seg button").forEach(function (b) { b.onclick = function () { SR.sfx.tap(); going = b.dataset.v === "1"; c.querySelectorAll(".seg button").forEach(function (x) { x.classList.toggle("on", x === b); }); $("rsvpQ").style.display = going ? "" : "none"; }; });
    $("qm").onclick = function () { qty = Math.max(1, qty - 1); $("qn").textContent = qty; SR.sfx.tap(); };
    $("qp").onclick = function () { qty = Math.min(12, qty + 1); $("qn").textContent = qty; SR.sfx.tap(); };
    $("rsvpX").onclick = close;
    $("rsvpSend").onclick = function () {
      var nome = $("rsvpNome").value.trim(); if (!nome) { $("rsvpErr").hidden = false; SR.sfx.bad(); return; }
      var msg = going ? "Olá! Aqui é " + nome + ". Confirmo presença na festa da Maria Heloísa (" + qty + (qty > 1 ? " pessoas" : " pessoa") + "). 🎉"
                      : "Olá! Aqui é " + nome + ". Infelizmente não poderei ir à festa da Maria Heloísa. 💗";
      var w = SR.config.rsvp.whatsapp; if (w) window.open("https://wa.me/" + w + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
      try { localStorage.setItem("sweetrace_rsvp", JSON.stringify({ nome: nome, vai: going, pessoas: qty, em: Date.now() })); } catch (e) {}
      close(); SR.sfx.win();
      SR.card(info$, { icon: going ? "🎉" : "💗", badge: going ? "Presença confirmada" : "Resposta enviada", title: going ? "Oba, até lá!" : "Que pena!", top: "30cqw",
        text: going ? "Obrigada por confirmar, " + nome.split(" ")[0] + "! A festa vai ser incrível." : "Obrigada por avisar, " + nome.split(" ")[0] + ". Sentiremos sua falta!", button: "Fechar", onClick: function () {} });
    };
  }
  info$.querySelectorAll(".hot").forEach(function (b) {
    b.addEventListener("click", function () {
      SR.audioInit(); SR.sfx.tap(); var a = b.dataset.act;
      if (a === "gifts") { $("s-gifts").classList.add("fade"); show("gifts"); }
      else if (a === "local") localCard(); else rsvpCard();
    });
  });
  $("back").addEventListener("click", function () { SR.sfx.tap(); info(false); });

  $("skip").addEventListener("click", function () { SR.audioInit(); info(false); });
  $("start").addEventListener("click", function () {
    SR.audioInit(); show("video"); play($("abertura"), $("tap"), function () { startGame(0); });
  });

  // atalhos para testar: #race #match #factory #env #info #gifts
  amb("capa"); layout();
  var h = location.hash.replace("#", "");
  if (h) { var i = ORDER.indexOf(h); if (i >= 0) startGame(i); else if (h === "env") envelope(); else if (h === "found") found(); else if (h === "info") info(false); else if (h === "gifts") show("gifts"); }
  window.__sr = { startGame: startGame, get game() { return game; }, info: info, envelope: envelope };
})();
