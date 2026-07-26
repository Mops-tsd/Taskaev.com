/* =============================================================
   Intro — emblem / seal ("Строим будущее")
   A restrained official title card on a light ground: a thin
   navy seal draws around the AT monogram, then the slogan and
   name reveal and lift into the hero. Skippable · reduced-motion.
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

  var C = function (r) { return (2 * Math.PI * r).toFixed(1); };

  var root = document.createElement("div");
  root.className = "intro intro--seal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", slogan);

  var ui = document.createElement("div");
  ui.className = "intro-ui";
  ui.innerHTML =
    '<button class="intro-skip" type="button" style="position:absolute"><span class="lbl">' + skipTxt + '</span><span class="bar"></span></button>' +
    '<div class="intro-emblem-wrap">' +
      '<svg class="intro-emblem" viewBox="0 0 200 200" aria-hidden="true">' +
        '<circle class="draw ring-out" cx="100" cy="100" r="92" stroke-width="1.4" style="--c:' + C(92) + '"/>' +
        '<circle class="draw ring-gold" cx="100" cy="100" r="83" stroke-width="1" style="--c:' + C(83) + '"/>' +
        '<circle class="draw ring-in" cx="100" cy="100" r="74" stroke-width="1" style="--c:' + C(74) + '"/>' +
        '<circle class="ticks" cx="100" cy="100" r="99"/>' +
        '<text class="mono-at" x="100" y="101">AT</text>' +
      '</svg>' +
    '</div>' +
    '<div class="intro-seal-text">' +
      '<span class="intro-name">' + esc(name) + '</span>' +
      '<h3>' + words(slogan) + '</h3>' +
      '<span class="rule"></span>' +
      '<span class="tag">' + esc(tagline) + '</span>' +
    '</div>';
  root.appendChild(ui);
  document.body.appendChild(root);
  document.body.classList.add("intro-playing");

  var failsafe = setTimeout(function () { dismiss(); }, 9000);
  var skipBtn = ui.querySelector(".intro-skip");
  var progressEl = ui.querySelector(".intro-skip .bar");

  var done = false, t0 = Date.now(), tick = 0;
  var DUR = 4900;

  // progress bar
  var prog = setInterval(function () {
    var p = Math.min((Date.now() - t0) / DUR, 1);
    progressEl.style.setProperty("--intro-progress", p.toFixed(3));
    if (p >= 1) clearInterval(prog);
  }, 60);

  var steps = [
    [300, function () { root.classList.add("step-1"); }],
    [1650, function () { root.classList.add("step-text"); }],
    [DUR, function () { dismiss(); }]
  ];
  var timers = steps.map(function (s) { return setTimeout(s[1], s[0]); });

  function dismiss() {
    if (done) return;
    done = true;
    clearTimeout(failsafe); clearInterval(prog); timers.forEach(clearTimeout);
    root.classList.add("hide");
    document.body.classList.remove("intro-playing");
    window.scrollTo(0, 0);
    setTimeout(function () { if (root && root.parentNode) root.parentNode.removeChild(root); }, 1000);
  }

  skipBtn.addEventListener("click", dismiss);
  document.addEventListener("keydown", function (ev) { if ((ev.key === "Escape" || ev.key === "Enter") && !done) dismiss(); });

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
})();
