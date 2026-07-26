/* =============================================================
   Intro — "Строим будущее"
   An abstract network of nodes lights up and connects (state,
   business, banks, investors converging around initiatives),
   then the brand slogan and name lock in and lift into the hero.
   No construction imagery. Skippable · reduced-motion safe.
   ============================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { document.body.classList.remove("intro-playing"); return; }

  var I18N = window.I18N || {};
  var lang = "ru";
  try { lang = localStorage.getItem("at-lang") || "ru"; } catch (e) {}
  var dict = I18N[lang] || I18N.ru || {};
  var slogan = dict.introSlogan || "Строим будущее";
  var tagline = dict.introTagline || "Стратегия · Развитие · Территории";
  var name = ((dict.heroTitleA || "Александр") + " " + (dict.heroTitleB || "Таскаев"));
  var skipTxt = ({ ru: "Пропустить", en: "Skip", zh: "跳过", ar: "تخطّي" })[lang] || "Skip";

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function words(t) { return String(t).split(" ").map(function (w, i) { return '<span class="w" style="--wi:' + i + '">' + esc(w) + "</span>"; }).join(" "); }

  /* ---------- DOM ---------- */
  var root = document.createElement("div");
  root.className = "intro intro--net";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", slogan);
  var canvas = document.createElement("canvas");
  root.appendChild(canvas);

  var ui = document.createElement("div");
  ui.className = "intro-ui";
  ui.innerHTML =
    '<div class="intro-brand">' + esc(name) + '</div>' +
    '<button class="intro-skip" type="button"><span class="lbl">' + skipTxt + '</span><span class="bar"></span></button>' +
    '<div class="intro-logo">' +
      '<span class="mark">AT</span>' +
      '<span class="intro-name">' + esc(name) + '</span>' +
      '<h3>' + words(slogan) + '</h3>' +
      '<span class="line"></span>' +
      '<span class="tag">' + esc(tagline) + '</span>' +
    '</div>';
  root.appendChild(ui);
  document.body.appendChild(root);
  document.body.classList.add("intro-playing");
  var failsafe = setTimeout(function () { dismiss(); }, 12000);

  var skipBtn = ui.querySelector(".intro-skip");
  var progressEl = ui.querySelector(".intro-skip .bar");

  /* ---------- Canvas ---------- */
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var rand = rng(20260726);
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  /* ---------- Build network (normalized coords) ---------- */
  var N = 46;
  var nodes = [];
  for (var i = 0; i < N; i++) {
    // organic distribution biased toward centre
    var a = rand() * Math.PI * 2;
    var r = Math.pow(rand(), 0.62) * 0.46;
    var nx = 0.5 + Math.cos(a) * r * 1.25;
    var ny = 0.5 + Math.sin(a) * r;
    nx = Math.min(0.94, Math.max(0.06, nx));
    ny = Math.min(0.92, Math.max(0.08, ny));
    var dc = Math.hypot(nx - 0.5, ny - 0.5);
    nodes.push({
      nx: nx, ny: ny,
      hub: false,
      warm: rand() < 0.18,
      baseR: 1.6 + rand() * 2.0,
      ph: rand() * Math.PI * 2, amp: 3 + rand() * 6, sp: 0.4 + rand() * 0.6,
      dc: dc, appear: 0
    });
  }
  // hubs = a few most-central nodes
  nodes.slice().sort(function (a, b) { return a.dc - b.dc; }).forEach(function (nd, idx) { if (idx < 5) { nd.hub = true; nd.baseR = 3.4 + rand() * 1.6; } });
  // appear order: centre outward
  var byCentre = nodes.slice().sort(function (a, b) { return a.dc - b.dc; });
  byCentre.forEach(function (nd, idx) { nd.appear = (idx / N) * 1.7; });

  // edges: nearest neighbours + hub links
  var edges = [];
  function dist(a, b) { return Math.hypot(nodes[a].nx - nodes[b].nx, nodes[a].ny - nodes[b].ny); }
  var seen = {};
  function addEdge(a, b) {
    if (a === b) return; var k = a < b ? a + "_" + b : b + "_" + a;
    if (seen[k]) return; seen[k] = 1;
    var ds = Math.max(nodes[a].appear, nodes[b].appear) + 0.5 + rand() * 0.9;
    edges.push({ a: a, b: b, ds: ds, dur: 0.7 + rand() * 0.5, pulse: rand() < 0.5, poff: rand(), psp: 0.5 + rand() * 0.5 });
  }
  for (var n1 = 0; n1 < N; n1++) {
    var order = [];
    for (var n2 = 0; n2 < N; n2++) if (n2 !== n1) order.push([n2, dist(n1, n2)]);
    order.sort(function (x, y) { return x[1] - y[1]; });
    var links = nodes[n1].hub ? 4 : 2;
    for (var l = 0; l < links && l < order.length; l++) addEdge(n1, order[l][0]);
  }

  function layout() { W = root.clientWidth; H = root.clientHeight; canvas.width = Math.max(1, Math.floor(W * dpr)); canvas.height = Math.max(1, Math.floor(H * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function px(nd, e) { var s = Math.min(W, H); return [nd.nx * W + Math.cos(nd.ph + e * 0.001 * nd.sp) * nd.amp, nd.ny * H + Math.sin(nd.ph + e * 0.001 * nd.sp) * nd.amp * 0.8]; }

  /* ---------- Timeline ---------- */
  var DUR = 7200;
  var start = null, raf = 0, done = false;
  var steps = { brand: false, logo: false };

  function frame(now) {
   try {
    if (start === null) start = now;
    var e = now - start, es = e / 1000;
    progressEl.style.setProperty("--intro-progress", clamp01(e / DUR).toFixed(3));
    if (e > 200 && !steps.brand) { steps.brand = true; root.classList.add("step-1"); }
    if (e > 4700 && !steps.logo) { steps.logo = true; root.classList.add("step-logo"); }

    var climax = clamp01((e - 4700) / 2100);

    ctx.clearRect(0, 0, W, H);
    // backdrop
    var bg = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
    bg.addColorStop(0, "rgba(12,20,28,0.6)"); bg.addColorStop(1, "rgba(4,7,10,0)");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // camera: slow drift + slight zoom
    var cam = 1.02 + 0.05 * easeOut(clamp01(es / 4)) - 0.03 * climax;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(cam, cam);
    ctx.rotate(Math.sin(es * 0.06) * 0.01);
    ctx.translate(-W / 2, -H / 2);

    var netDim = 1 - 0.45 * climax;

    // edges
    for (var k = 0; k < edges.length; k++) {
      var ed = edges[k];
      var dp = clamp01((es - ed.ds) / ed.dur);
      if (dp <= 0) continue;
      var A = px(nodes[ed.a], e), B = px(nodes[ed.b], e);
      var ex = A[0] + (B[0] - A[0]) * dp, ey = A[1] + (B[1] - A[1]) * dp;
      ctx.strokeStyle = "rgba(121,230,242," + (0.16 * netDim) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(ex, ey); ctx.stroke();
      // pulse
      if (ed.pulse && dp >= 1) {
        var t = ((es * ed.psp + ed.poff) % 1);
        var pxp = A[0] + (B[0] - A[0]) * t, pyp = A[1] + (B[1] - A[1]) * t;
        ctx.fillStyle = "rgba(160,238,247," + (0.9 * netDim) + ")";
        ctx.beginPath(); ctx.arc(pxp, pyp, 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }

    // nodes
    for (var m = 0; m < nodes.length; m++) {
      var nd = nodes[m];
      var ap = easeOut(clamp01((es - nd.appear) / 0.7));
      if (ap <= 0) continue;
      var P = px(nd, e);
      var rr = nd.baseR * ap;
      var col = nd.warm ? "232,162,92" : "121,230,242";
      // halo
      var pulse = 0.6 + 0.4 * Math.sin(es * 1.6 + nd.ph);
      var halo = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], rr * (nd.hub ? 7 : 4.5));
      halo.addColorStop(0, "rgba(" + col + "," + (0.5 * ap * netDim * pulse) + ")");
      halo.addColorStop(1, "rgba(" + col + ",0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(P[0], P[1], rr * (nd.hub ? 7 : 4.5), 0, Math.PI * 2); ctx.fill();
      // core
      ctx.fillStyle = "rgba(" + (nd.warm ? "245,210,170" : "200,245,251") + "," + (ap * netDim) + ")";
      ctx.beginPath(); ctx.arc(P[0], P[1], rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // light sweep at climax
    if (e > 4700 && e < 6000) {
      var sw = clamp01((e - 4700) / 1300);
      var xx = -W * 0.4 + sw * (W * 1.8);
      ctx.save(); ctx.globalCompositeOperation = "screen";
      var lg = ctx.createLinearGradient(xx - 220, 0, xx + 220, H);
      var a2 = 0.12 * Math.sin(sw * Math.PI);
      lg.addColorStop(0, "rgba(121,230,242,0)"); lg.addColorStop(0.5, "rgba(160,238,247," + a2 + ")"); lg.addColorStop(1, "rgba(121,230,242,0)");
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    // vignette
    var vig = 0.6 + 0.28 * climax;
    var vg = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * (0.3 - 0.1 * climax), W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(4,7,10," + vig + ")");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    if (e >= DUR && !done) { dismiss(); return; }
    raf = requestAnimationFrame(frame);
   } catch (err) { dismiss(); }
  }

  /* ---------- Dismiss ---------- */
  function dismiss() {
    if (done) return;
    done = true; clearTimeout(failsafe); cancelAnimationFrame(raf);
    root.classList.add("hide");
    document.body.classList.remove("intro-playing");
    window.scrollTo(0, 0);
    setTimeout(function () { if (root && root.parentNode) root.parentNode.removeChild(root); }, 1000);
  }
  skipBtn.addEventListener("click", dismiss);
  document.addEventListener("keydown", function (ev) { if ((ev.key === "Escape" || ev.key === "Enter") && !done) dismiss(); });

  /* ---------- Start ---------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  layout();
  var resizeT;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (!done) layout(); }, 150); });
  raf = requestAnimationFrame(frame);
  setTimeout(function () { if (!done) dismiss(); }, DUR + 2600);
})();
