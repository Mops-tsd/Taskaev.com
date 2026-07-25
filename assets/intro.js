/* =============================================================
   Intro — "Kenon Riviera Park" cinematic city build (Canvas 2D)
   An isometric masterplan of 25 residential towers rises from the
   ground beside the river, windows light up, then it lifts into
   the hero. Skippable · reduced-motion safe · progressive.
   ============================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    document.body.classList.remove("intro-playing");
    return; // no intro; hero shows immediately
  }

  var I18N = window.I18N || {};
  var lang = "ru";
  try { lang = localStorage.getItem("at-lang") || "ru"; } catch (e) {}
  var dict = I18N[lang] || I18N.ru || {};
  var kenon = dict.kenon || { title: "Кенон Ривьера Парк", city: "Чита • Забайкальский край", metrics: ["≈380 тыс. м²", "25 жилых домов", "28 млрд ₽ инвестиций"] };
  var eyebrowTxt = dict.projectsEyebrow || "Флагманский проект";
  var skipTxt = ({ ru: "Пропустить", en: "Skip", zh: "跳过", ar: "تخطّي" })[lang] || "Skip";

  /* ---------- Build DOM ---------- */
  var root = document.createElement("div");
  root.className = "intro";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", kenon.title);

  var canvas = document.createElement("canvas");
  root.appendChild(canvas);

  var ui = document.createElement("div");
  ui.className = "intro-ui";
  ui.innerHTML =
    '<div class="intro-coords"><b>KENON RIVIERA PARK</b>52°02′N&nbsp;&nbsp;113°30′E · Чита</div>' +
    '<button class="intro-skip" type="button"><span class="lbl">' + skipTxt + '</span><span class="bar"></span></button>' +
    '<div class="intro-title">' +
      '<span class="eyebrow">' + esc(eyebrowTxt) + '</span>' +
      '<h2>' + titleWords(kenon.title) + '</h2>' +
      '<div class="city">' + esc(kenon.city || "") + '</div>' +
      '<ul class="intro-metrics">' +
        (kenon.metrics || []).map(function (m) { return '<li data-final="' + esc(m) + '">' + esc(m) + '</li>'; }).join("") +
      '</ul>' +
    '</div>';
  root.appendChild(ui);
  document.body.appendChild(root);
  document.body.classList.add("intro-playing");
  // failsafe: never trap the user even if animation errors before its own timer
  var failsafe = setTimeout(function () { dismiss(); }, 9000);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function titleWords(t) {
    return String(t).split(" ").map(function (w) { return '<span class="w">' + esc(w) + "</span>"; }).join(" ");
  }

  var skipBtn = ui.querySelector(".intro-skip");
  var progressEl = ui.querySelector(".intro-skip .bar");

  /* ---------- Canvas setup ---------- */
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var rand = rng(20260725);

  /* ---------- Masterplan: exactly 25 residential towers by the river ---------- */
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
      buildings.push({
        gx: gx, gy: gy,
        w: 1.0 + rand() * 0.22, d: 1.0 + rand() * 0.22,
        hUnits: 2.0 + skyline * 5.6 + rand() * 0.9,
        order: (i + j) + rand() * 0.7,
        seed: (i * 31 + j * 7 + 3),
        civic: false
      });
    }
  }
  // two low amenity pavilions on the front plaza (not part of the 25)
  buildings.push({ gx: 4.0, gy: 9.6, w: 1.8, d: 1.2, hUnits: 1.0, order: 8.4, seed: 91, civic: true });
  buildings.push({ gx: 7.2, gy: 9.2, w: 1.4, d: 1.4, hUnits: 0.9, order: 8.8, seed: 77, civic: true });

  var orderMax = 0;
  buildings.forEach(function (b) { if (b.order > orderMax) orderMax = b.order; });

  // precompute window layouts
  buildings.forEach(function (b) {
    var wr = rng(b.seed * 999 + 1);
    b.win = [];
    if (b.civic) return;
    var cols = 3, rows = Math.max(3, Math.round(b.hUnits * 1.3));
    for (var f = 0; f < 2; f++) {
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          b.win.push({ face: f, c: c, r: r, cols: cols, rows: rows, th: wr(), warm: wr() < 0.16 });
        }
      }
    }
  });

  var HALF_W, HALF_H, originX, originY, fit;
  function layout() {
    W = root.clientWidth; H = root.clientHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var u = Math.max(12, Math.min(W, H) / 24);
    HALF_W = u * 1.92; HALF_H = u * 0.96;

    // provisional bbox to fit the plan on screen
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    buildings.forEach(function (b) {
      var pts = [[b.gx, b.gy, 0], [b.gx + b.w, b.gy, 0], [b.gx + b.w, b.gy + b.d, 0], [b.gx, b.gy + b.d, 0], [b.gx, b.gy, b.hUnits * u * 1.15]];
      pts.forEach(function (p) {
        var sx = (p[0] - p[1]) * HALF_W;
        var sy = (p[0] + p[1]) * HALF_H - p[2];
        if (sx < minx) minx = sx; if (sx > maxx) maxx = sx;
        if (sy < miny) miny = sy; if (sy > maxy) maxy = sy;
      });
    });
    var planW = maxx - minx, planH = maxy - miny;
    fit = Math.min((W * 0.86) / planW, (H * 0.66) / planH, 1.25);
    originX = W / 2 - ((minx + maxx) / 2) * fit;
    originY = H * 0.60 - ((miny + maxy) / 2) * fit;
  }

  function iso(gx, gy, z) {
    return [originX + ((gx - gy) * HALF_W) * fit, originY + ((gx + gy) * HALF_H - z) * fit];
  }

  /* ---------- Snow particles (Zabaykalye winter) ---------- */
  var snow = [];
  function initSnow() {
    snow = [];
    var n = Math.round((W * H) / 26000);
    for (var k = 0; k < Math.min(n, 90); k++) {
      snow.push({ x: rand() * W, y: rand() * H, r: 0.6 + rand() * 1.8, sp: 0.15 + rand() * 0.5, sw: rand() * Math.PI * 2, amp: 6 + rand() * 14 });
    }
  }

  /* ---------- Easing ---------- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  /* ---------- Draw a single building ---------- */
  function drawBuilding(b, h, lightP, gt) {
    // ground contact shadow
    var s0 = iso(b.gx, b.gy, 0), s1 = iso(b.gx + b.w, b.gy, 0), s2 = iso(b.gx + b.w, b.gy + b.d, 0), s3 = iso(b.gx, b.gy + b.d, 0);
    var cx = (s0[0] + s2[0]) / 2, cy = (s0[1] + s2[1]) / 2;
    var rad = HALF_W * fit * Math.max(b.w, b.d) * 1.15;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.5, 0, 0, Math.PI * 2); ctx.fill();

    if (h < 0.5) return;

    var t0 = iso(b.gx, b.gy, h), t1 = iso(b.gx + b.w, b.gy, h), t2 = iso(b.gx + b.w, b.gy + b.d, h), t3 = iso(b.gx, b.gy + b.d, h);

    // right face (edge b1->b2 : from (gx+w,gy) to (gx+w,gy+d))
    ctx.fillStyle = b.civic ? "#0e2a24" : "#0c2731";
    poly([s1, s2, t2, t1]);
    // left face (edge b2->b3 : from (gx+w,gy+d) to (gx,gy+d))
    ctx.fillStyle = b.civic ? "#0a211d" : "#081c24";
    poly([s2, s3, t3, t2]);

    // windows
    if (!b.civic && b.win.length) {
      // right face param: P00=s1,P10=s2,P01=t1,P11=t2  ; left: P00=s2,P10=s3,P01=t2,P11=t3
      var faces = [[s1, s2, t1, t2], [s2, s3, t2, t3]];
      for (var wi = 0; wi < b.win.length; wi++) {
        var wv = b.win[wi];
        var F = faces[wv.face];
        var uu = (wv.c + 0.5) / wv.cols;
        var vv = (wv.r + 0.5) / wv.rows;
        // bilinear: bottom edge P00->P10, top edge P01->P11
        var bx = F[0][0] + (F[1][0] - F[0][0]) * uu, by = F[0][1] + (F[1][1] - F[0][1]) * uu;
        var tx = F[2][0] + (F[3][0] - F[2][0]) * uu, ty = F[2][1] + (F[3][1] - F[2][1]) * uu;
        var px = bx + (tx - bx) * vv, py = by + (ty - by) * vv;
        var lit = wv.th < lightP;
        var ws = HALF_W * fit * 0.16;
        if (lit) {
          var flick = 0.75 + 0.25 * Math.sin(gt * 0.004 + wv.th * 30);
          ctx.fillStyle = wv.warm ? "rgba(232,162,92," + (0.85 * flick) + ")" : "rgba(150,235,246," + (0.9 * flick) + ")";
        } else {
          ctx.fillStyle = "rgba(120,180,200,0.06)";
        }
        ctx.fillRect(px - ws / 2, py - ws * 0.9, ws, ws * 1.4);
      }
    }

    // top face
    ctx.fillStyle = b.civic ? "#14392f" : "#173642";
    poly([t0, t1, t2, t3]);
    // top inner accent line
    ctx.strokeStyle = "rgba(121,230,242,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.lineTo(t3[0], t3[1]); ctx.closePath(); ctx.stroke();

    // glowing vertical silhouette edges
    ctx.strokeStyle = "rgba(121,230,242,0.32)"; ctx.lineWidth = 1;
    edge(s1, t1); edge(s2, t2); edge(s3, t3);
  }

  function poly(p) {
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function edge(a, b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }

  /* ---------- Ground grid + river ---------- */
  function drawGround(p) {
    // streets grid drawing in
    var gmin = -1, gmax = 12;
    ctx.lineWidth = 1;
    for (var gx = gmin; gx <= gmax; gx += 1) {
      var a = iso(gx, gmin, 0), b = iso(gx, gmin + (gmax - gmin) * p, 0);
      ctx.strokeStyle = "rgba(121,230,242," + (0.07 + 0.05 * (gx % 2 === 0 ? 1 : 0)) + ")";
      edge(a, b);
    }
    for (var gy = gmin; gy <= gmax; gy += 1) {
      var c = iso(gmin, gy, 0), d = iso(gmin + (gmax - gmin) * p, gy, 0);
      ctx.strokeStyle = "rgba(121,230,242," + (0.07 + 0.05 * (gy % 2 === 0 ? 1 : 0)) + ")";
      edge(c, d);
    }
  }
  function drawRiver(gt, p) {
    // river band behind the towers (small gy)
    var r0 = iso(-1, -1.6, 0), r1 = iso(12, -1.6, 0), r2 = iso(12, 0.7, 0), r3 = iso(-1, 0.7, 0);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.lineTo(r3[0], r3[1]); ctx.closePath();
    ctx.clip();
    var gg = ctx.createLinearGradient(r0[0], r0[1], r3[0], r2[1]);
    gg.addColorStop(0, "rgba(10,30,42," + (0.9 * p) + ")");
    gg.addColorStop(1, "rgba(18,58,72," + (0.85 * p) + ")");
    ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    // shimmer
    ctx.globalCompositeOperation = "screen";
    for (var s = 0; s < 4; s++) {
      var yy = ((gt * 0.02 + s * 60) % (H + 120)) - 60;
      ctx.fillStyle = "rgba(121,230,242,0.05)";
      ctx.fillRect(0, yy, W, 10);
    }
    ctx.restore();
  }

  /* ---------- Timeline ---------- */
  var DUR = 5600;
  var start = null, raf = 0, done = false;
  var steps = { c1: false, title: false, city: false, metrics: false };

  function setStep(cls) { root.classList.add(cls); }

  function frame(now) {
   try {
    if (start === null) start = now;
    var e = now - start;         // elapsed ms
    var gt = e;                  // for shimmer/flicker
    var p = clamp01(e / DUR);
    progressEl.style.setProperty("--intro-progress", p.toFixed(3));

    // step reveals
    if (e > 250 && !steps.c1) { steps.c1 = true; setStep("step-1"); }
    if (e > 1700 && !steps.title) { steps.title = true; setStep("step-title"); }
    if (e > 2200 && !steps.city) { steps.city = true; setStep("step-city"); }
    if (e > 2700 && !steps.metrics) { steps.metrics = true; setStep("step-metrics"); runCounts(); }

    // camera: gentle zoom-out + drift
    var cam = 1.12 - 0.12 * easeOut(clamp01(e / 3600));
    var drift = Math.sin(e * 0.0004) * 6;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H * 0.52 + drift);
    ctx.scale(cam, cam);
    ctx.translate(-W / 2, -(H * 0.52));

    var groundP = easeOut(clamp01((e - 300) / 1100));
    drawRiver(gt, easeOut(clamp01((e - 500) / 1200)));
    drawGround(groundP);

    // buildings back-to-front
    var u = Math.max(12, Math.min(W, H) / 24);
    var sorted = buildings.slice().sort(function (a, b) { return (a.gx + a.gy) - (b.gx + b.gy); });
    for (var k = 0; k < sorted.length; k++) {
      var b = sorted[k];
      var rs = 900 + (b.order / orderMax) * 2000;   // rise start
      var rt = clamp01((e - rs) / 950);              // rise progress
      var hFull = b.hUnits * u * 1.15;
      var h = hFull * easeOut(rt);
      var lightP = clamp01((e - (rs + 700)) / 1400); // windows light after rise
      drawBuilding(b, h, lightP, gt);
    }

    ctx.restore();

    // snow (screen space)
    ctx.save();
    for (var si = 0; si < snow.length; si++) {
      var f = snow[si];
      f.y += f.sp * 1.4; f.sw += 0.01;
      f.x += Math.sin(f.sw) * 0.3;
      if (f.y > H + 4) { f.y = -4; f.x = rand() * W; }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(220,240,245,0.8)";
      ctx.beginPath(); ctx.arc(f.x + Math.sin(f.sw) * f.amp * 0.15, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // vignette
    var vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(4,7,10,0.72)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    if (e >= DUR && !done) { dismiss(); return; }
    raf = requestAnimationFrame(frame);
   } catch (err) { dismiss(); }
  }

  /* ---------- Metric counters ---------- */
  function runCounts() {
    ui.querySelectorAll(".intro-metrics li").forEach(function (li) {
      var text = li.getAttribute("data-final");
      var m = text.match(/[\d٠-٩][\d.,٠-٩]*/);
      if (!m) return;
      var raw = m[0], prefix = text.slice(0, m.index), suffix = text.slice(m.index + raw.length);
      var ascii = raw.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
      var arabic = /[٠-٩]/.test(raw);
      var decSep = ascii.indexOf(",") > -1 ? "," : (ascii.indexOf(".") > -1 ? "." : "");
      var target = parseFloat(ascii.replace(",", ".")); if (isNaN(target)) return;
      var dec = decSep ? (ascii.split(decSep)[1] || "").length : 0;
      var t0 = null, dur = 1100;
      function toAr(s) { return s.replace(/[0-9]/g, function (d) { return String.fromCharCode(0x0660 + +d); }); }
      function step(ts) {
        if (t0 === null) t0 = ts;
        var t = clamp01((ts - t0) / dur), v = target * easeOut(t);
        var out = dec ? v.toFixed(dec) : Math.round(v).toString();
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
    done = true;
    clearTimeout(failsafe);
    cancelAnimationFrame(raf);
    root.classList.add("hide");
    document.body.classList.remove("intro-playing"); // release hero entrance
    window.scrollTo(0, 0);
    setTimeout(function () { if (root && root.parentNode) root.parentNode.removeChild(root); }, 1000);
  }

  skipBtn.addEventListener("click", dismiss);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" || ev.key === "Enter") { if (!done) dismiss(); } });

  /* ---------- Start ---------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  layout(); initSnow();
  var resizeT;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (!done) { layout(); initSnow(); } }, 150); });
  raf = requestAnimationFrame(frame);

  // safety: never trap the user
  setTimeout(function () { if (!done) dismiss(); }, DUR + 2500);
})();
