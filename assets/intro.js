/* =============================================================
   Intro — cinematic city build + "Строим будущее" logo reveal
   An isometric masterplan of Kenon Riviera Park rises from the
   ground, windows light up, then the brand slogan locks in over
   the skyline before lifting into the hero.
   Skippable · reduced-motion safe · progressive.
   ============================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { document.body.classList.remove("intro-playing"); return; }

  var I18N = window.I18N || {};
  var lang = "ru";
  try { lang = localStorage.getItem("at-lang") || "ru"; } catch (e) {}
  var dict = I18N[lang] || I18N.ru || {};
  var kenon = dict.kenon || { title: "Кенон Ривьера Парк", city: "Чита • Забайкальский край" };
  var metrics = (dict.projectsAll && dict.projectsAll[0] && dict.projectsAll[0].metrics) ||
                kenon.metrics || ["392 784 м²", "6 468 квартир", "≈10 000 жителей"];
  var eyebrowTxt = dict.projectsEyebrow || "Флагманский проект";
  var slogan = dict.introSlogan || "Строим будущее";
  var tagline = dict.introTagline || "Стратегия · Девелопмент · Территории";
  var skipTxt = ({ ru: "Пропустить", en: "Skip", zh: "跳过", ar: "تخطّي" })[lang] || "Skip";

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function words(t) { return String(t).split(" ").map(function (w, i) { return '<span class="w" style="--wi:' + i + '">' + esc(w) + "</span>"; }).join(" "); }

  /* ---------- Build DOM ---------- */
  var root = document.createElement("div");
  root.className = "intro";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", slogan);

  var canvas = document.createElement("canvas");
  root.appendChild(canvas);

  var ui = document.createElement("div");
  ui.className = "intro-ui";
  ui.innerHTML =
    '<div class="intro-coords"><b>KENON RIVIERA PARK</b>52°02′N&nbsp;&nbsp;113°30′E · Чита</div>' +
    '<button class="intro-skip" type="button"><span class="lbl">' + skipTxt + '</span><span class="bar"></span></button>' +
    '<div class="intro-project">' +
      '<span class="eyebrow">' + esc(eyebrowTxt) + '</span>' +
      '<h2>' + esc(kenon.title) + '</h2>' +
      '<div class="city">' + esc(kenon.city || "") + '</div>' +
      '<ul class="intro-metrics">' +
        metrics.map(function (m) { return '<li data-final="' + esc(m) + '">' + esc(m) + '</li>'; }).join("") +
      '</ul>' +
    '</div>' +
    '<div class="intro-logo">' +
      '<span class="mark">AT</span>' +
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

  /* ---------- Canvas setup ---------- */
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var rand = rng(20260725);

  /* ---------- Masterplan: 25 residential towers by the river ---------- */
  var GRID = 5, GAP = 2.15;
  var buildings = [];
  for (var j = 0; j < GRID; j++) {
    for (var i = 0; i < GRID; i++) {
      var gx = 1.4 + i * GAP + (rand() - 0.5) * 0.45;
      var gy = 1.4 + j * GAP + (rand() - 0.5) * 0.45;
      var dx = (i - (GRID - 1) / 2) / ((GRID - 1) / 2);
      var dy = (j - (GRID - 1) / 2) / ((GRID - 1) / 2);
      var dcenter = Math.sqrt(dx * dx + dy * dy);
      var skyline = Math.max(0, 1 - dcenter * 0.72);
      buildings.push({ gx: gx, gy: gy, w: 1.0 + rand() * 0.22, d: 1.0 + rand() * 0.22, hUnits: 2.0 + skyline * 5.6 + rand() * 0.9, order: (i + j) + rand() * 0.7, seed: (i * 31 + j * 7 + 3), civic: false });
    }
  }
  buildings.push({ gx: 4.0, gy: 9.6, w: 1.8, d: 1.2, hUnits: 1.0, order: 8.4, seed: 91, civic: true });
  buildings.push({ gx: 7.2, gy: 9.2, w: 1.4, d: 1.4, hUnits: 0.9, order: 8.8, seed: 77, civic: true });
  var orderMax = 0;
  buildings.forEach(function (b) { if (b.order > orderMax) orderMax = b.order; });
  buildings.forEach(function (b) {
    var wr = rng(b.seed * 999 + 1); b.win = [];
    if (b.civic) return;
    var cols = 3, rows = Math.max(3, Math.round(b.hUnits * 1.3));
    for (var f = 0; f < 2; f++) for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++)
      b.win.push({ face: f, c: c, r: r, cols: cols, rows: rows, th: wr(), warm: wr() < 0.16 });
  });

  var HALF_W, HALF_H, originX, originY, fit;
  function layout() {
    W = root.clientWidth; H = root.clientHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr)); canvas.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var u = Math.max(12, Math.min(W, H) / 24);
    HALF_W = u * 1.92; HALF_H = u * 0.96;
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    buildings.forEach(function (b) {
      var pts = [[b.gx, b.gy, 0], [b.gx + b.w, b.gy, 0], [b.gx + b.w, b.gy + b.d, 0], [b.gx, b.gy + b.d, 0], [b.gx, b.gy, b.hUnits * u * 1.15]];
      pts.forEach(function (p) { var sx = (p[0] - p[1]) * HALF_W, sy = (p[0] + p[1]) * HALF_H - p[2]; if (sx < minx) minx = sx; if (sx > maxx) maxx = sx; if (sy < miny) miny = sy; if (sy > maxy) maxy = sy; });
    });
    var planW = maxx - minx, planH = maxy - miny;
    fit = Math.min((W * 0.86) / planW, (H * 0.62) / planH, 1.25);
    originX = W / 2 - ((minx + maxx) / 2) * fit;
    originY = H * 0.58 - ((miny + maxy) / 2) * fit;
  }
  function iso(gx, gy, z) { return [originX + ((gx - gy) * HALF_W) * fit, originY + ((gx + gy) * HALF_H - z) * fit]; }

  var snow = [];
  function initSnow() { snow = []; var n = Math.round((W * H) / 26000); for (var k = 0; k < Math.min(n, 90); k++) snow.push({ x: rand() * W, y: rand() * H, r: 0.6 + rand() * 1.8, sp: 0.15 + rand() * 0.5, sw: rand() * Math.PI * 2, amp: 6 + rand() * 14 }); }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  function drawBuilding(b, h, lightP, gt) {
    var s0 = iso(b.gx, b.gy, 0), s1 = iso(b.gx + b.w, b.gy, 0), s2 = iso(b.gx + b.w, b.gy + b.d, 0), s3 = iso(b.gx, b.gy + b.d, 0);
    var cx = (s0[0] + s2[0]) / 2, cy = (s0[1] + s2[1]) / 2;
    var rad = HALF_W * fit * Math.max(b.w, b.d) * 1.15;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    if (h < 0.5) return;
    var t0 = iso(b.gx, b.gy, h), t1 = iso(b.gx + b.w, b.gy, h), t2 = iso(b.gx + b.w, b.gy + b.d, h), t3 = iso(b.gx, b.gy + b.d, h);
    ctx.fillStyle = b.civic ? "#0e2a24" : "#0c2731"; poly([s1, s2, t2, t1]);
    ctx.fillStyle = b.civic ? "#0a211d" : "#081c24"; poly([s2, s3, t3, t2]);
    if (!b.civic && b.win.length) {
      var faces = [[s1, s2, t1, t2], [s2, s3, t2, t3]];
      for (var wi = 0; wi < b.win.length; wi++) {
        var wv = b.win[wi], F = faces[wv.face];
        var uu = (wv.c + 0.5) / wv.cols, vv = (wv.r + 0.5) / wv.rows;
        var bx = F[0][0] + (F[1][0] - F[0][0]) * uu, by = F[0][1] + (F[1][1] - F[0][1]) * uu;
        var tx = F[2][0] + (F[3][0] - F[2][0]) * uu, ty = F[2][1] + (F[3][1] - F[2][1]) * uu;
        var px = bx + (tx - bx) * vv, py = by + (ty - by) * vv;
        var ws = HALF_W * fit * 0.16;
        if (wv.th < lightP) {
          var flick = 0.75 + 0.25 * Math.sin(gt * 0.004 + wv.th * 30);
          ctx.fillStyle = wv.warm ? "rgba(232,162,92," + (0.85 * flick) + ")" : "rgba(150,235,246," + (0.9 * flick) + ")";
        } else ctx.fillStyle = "rgba(120,180,200,0.06)";
        ctx.fillRect(px - ws / 2, py - ws * 0.9, ws, ws * 1.4);
      }
    }
    ctx.fillStyle = b.civic ? "#14392f" : "#173642"; poly([t0, t1, t2, t3]);
    ctx.strokeStyle = "rgba(121,230,242,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.lineTo(t3[0], t3[1]); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = "rgba(121,230,242,0.32)"; ctx.lineWidth = 1;
    edge(s1, t1); edge(s2, t2); edge(s3, t3);
  }
  function poly(p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); ctx.fill(); }
  function edge(a, b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }

  function drawGround(p) {
    var gmin = -1, gmax = 12; ctx.lineWidth = 1;
    for (var gx = gmin; gx <= gmax; gx += 1) { var a = iso(gx, gmin, 0), b = iso(gx, gmin + (gmax - gmin) * p, 0); ctx.strokeStyle = "rgba(121,230,242," + (0.07 + 0.05 * (gx % 2 === 0 ? 1 : 0)) + ")"; edge(a, b); }
    for (var gy = gmin; gy <= gmax; gy += 1) { var c = iso(gmin, gy, 0), d = iso(gmin + (gmax - gmin) * p, gy, 0); ctx.strokeStyle = "rgba(121,230,242," + (0.07 + 0.05 * (gy % 2 === 0 ? 1 : 0)) + ")"; edge(c, d); }
  }
  function drawRiver(gt, p) {
    var r0 = iso(-1, -1.6, 0), r1 = iso(12, -1.6, 0), r2 = iso(12, 0.7, 0), r3 = iso(-1, 0.7, 0);
    ctx.save(); ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.lineTo(r3[0], r3[1]); ctx.closePath(); ctx.clip();
    var gg = ctx.createLinearGradient(r0[0], r0[1], r3[0], r2[1]);
    gg.addColorStop(0, "rgba(10,30,42," + (0.9 * p) + ")"); gg.addColorStop(1, "rgba(18,58,72," + (0.85 * p) + ")");
    ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "screen";
    for (var s = 0; s < 4; s++) { var yy = ((gt * 0.02 + s * 60) % (H + 120)) - 60; ctx.fillStyle = "rgba(121,230,242,0.05)"; ctx.fillRect(0, yy, W, 10); }
    ctx.restore();
  }

  /* ---------- Timeline ---------- */
  var DUR = 7800;
  var start = null, raf = 0, done = false;
  var steps = { c1: false, project: false, city: false, metrics: false, logo: false };
  function setStep(cls) { root.classList.add(cls); }

  function frame(now) {
   try {
    if (start === null) start = now;
    var e = now - start, gt = e;
    progressEl.style.setProperty("--intro-progress", clamp01(e / DUR).toFixed(3));

    if (e > 250 && !steps.c1) { steps.c1 = true; setStep("step-1"); }
    if (e > 1700 && !steps.project) { steps.project = true; setStep("step-project"); }
    if (e > 2200 && !steps.city) { steps.city = true; setStep("step-city"); }
    if (e > 2700 && !steps.metrics) { steps.metrics = true; setStep("step-metrics"); runCounts(); }
    if (e > 4900 && !steps.logo) { steps.logo = true; setStep("step-logo"); }

    // camera: pull-out during build, then a gentle push-in for the finale
    var climax = clamp01((e - 4900) / 2200);
    var cam = (1.12 - 0.12 * easeOut(clamp01(e / 3800))) + 0.06 * easeOut(climax);
    var drift = Math.sin(e * 0.0004) * 6;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H * 0.52 + drift); ctx.scale(cam, cam); ctx.translate(-W / 2, -(H * 0.52));

    drawRiver(gt, easeOut(clamp01((e - 500) / 1200)));
    drawGround(easeOut(clamp01((e - 300) / 1100)));

    var u = Math.max(12, Math.min(W, H) / 24);
    var sorted = buildings.slice().sort(function (a, b) { return (a.gx + a.gy) - (b.gx + b.gy); });
    for (var k = 0; k < sorted.length; k++) {
      var b = sorted[k];
      var rs = 900 + (b.order / orderMax) * 2400;
      var h = (b.hUnits * u * 1.15) * easeOut(clamp01((e - rs) / 1000));
      drawBuilding(b, h, clamp01((e - (rs + 800)) / 1600), gt);
    }
    ctx.restore();

    // snow
    for (var si = 0; si < snow.length; si++) {
      var f = snow[si]; f.y += f.sp * 1.4; f.sw += 0.01; f.x += Math.sin(f.sw) * 0.3;
      if (f.y > H + 4) { f.y = -4; f.x = rand() * W; }
      ctx.globalAlpha = 0.5; ctx.fillStyle = "rgba(220,240,245,0.8)";
      ctx.beginPath(); ctx.arc(f.x + Math.sin(f.sw) * f.amp * 0.15, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // light sweep across the finale
    if (e > 4900 && e < 6200) {
      var sw = clamp01((e - 4900) / 1300);
      var xx = -W * 0.4 + sw * (W * 1.8);
      ctx.save(); ctx.globalCompositeOperation = "screen";
      var lg = ctx.createLinearGradient(xx - 220, 0, xx + 220, H);
      var a = 0.14 * Math.sin(sw * Math.PI);
      lg.addColorStop(0, "rgba(121,230,242,0)"); lg.addColorStop(0.5, "rgba(160,238,247," + a + ")"); lg.addColorStop(1, "rgba(121,230,242,0)");
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    // vignette — deepens for the finale to spotlight the slogan
    var vig = 0.72 + 0.16 * climax;
    var vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * (0.22 - 0.06 * climax), W / 2, H * 0.5, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(4,7,10," + vig + ")");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    if (e >= DUR && !done) { dismiss(); return; }
    raf = requestAnimationFrame(frame);
   } catch (err) { dismiss(); }
  }

  /* ---------- Metric counters ---------- */
  function runCounts() {
    ui.querySelectorAll(".intro-metrics li").forEach(function (li) {
      var text = li.getAttribute("data-final");
      var m = text.match(/[\d٠-٩][\d.,\s٠-٩]*/);
      if (!m) return;
      var raw = m[0].trim(), prefix = text.slice(0, m.index), suffix = text.slice(m.index + m[0].length);
      var ascii = raw.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); }).replace(/\s/g, "");
      var arabic = /[٠-٩]/.test(raw);
      var decSep = ascii.indexOf(",") > -1 ? "," : (ascii.indexOf(".") > -1 ? "." : "");
      var target = parseFloat(ascii.replace(",", ".")); if (isNaN(target)) return;
      var dec = decSep ? (ascii.split(decSep)[1] || "").length : 0;
      var t0 = null, dur = 1200;
      function grp(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
      function toAr(s) { return s.replace(/[0-9]/g, function (d) { return String.fromCharCode(0x0660 + +d); }); }
      function step(ts) {
        if (t0 === null) t0 = ts;
        var t = clamp01((ts - t0) / dur), v = target * easeOut(t);
        var out = dec ? v.toFixed(dec) : grp(Math.round(v).toString());
        if (decSep === ",") out = out.replace(".", ",");
        if (arabic) out = toAr(out);
        li.textContent = prefix + out + suffix;
        if (t < 1) requestAnimationFrame(step); else li.textContent = text;
      }
      requestAnimationFrame(step);
    });
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
  layout(); initSnow();
  var resizeT;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (!done) { layout(); initSnow(); } }, 150); });
  raf = requestAnimationFrame(frame);
  setTimeout(function () { if (!done) dismiss(); }, DUR + 2600);
})();
