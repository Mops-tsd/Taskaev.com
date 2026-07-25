/* =============================================================
   Alexander Taskaev — interactions
   i18n · nav · reveal · counters · hero · form
   ============================================================= */
(function () {
  "use strict";

  var I18N = window.I18N || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Resolve a dotted path (e.g. "stats.0.value") inside a language object
  function resolve(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /* ---------- i18n ---------- */
  var LANGS = ["ru", "en", "zh", "ar"];
  var currentLang = "ru";

  function applyLang(lang, animate) {
    if (LANGS.indexOf(lang) === -1) lang = "ru";
    var dict = I18N[lang];
    if (!dict) return;
    currentLang = lang;

    var doSwap = function () {
      $all("[data-i18n]").forEach(function (el) {
        var val = resolve(dict, el.getAttribute("data-i18n"));
        if (typeof val === "string") {
          if (el.hasAttribute("data-count")) {
            el.dataset.final = val;
            // if already counted (or motion reduced) show final immediately
            if (el.dataset.counted === "1" || reduceMotion) el.textContent = val;
            else el.textContent = val; // baseline; counter overwrites when revealed
          } else {
            el.textContent = val;
          }
        }
      });

      // document direction / lang
      var rtl = lang === "ar";
      document.documentElement.lang = lang;
      document.documentElement.dir = rtl ? "rtl" : "ltr";

      // active state on every language switcher instance
      $all(".lang button").forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
      });

      try { localStorage.setItem("at-lang", lang); } catch (e) {}
    };

    if (animate && !reduceMotion) {
      document.body.classList.add("lang-swapping");
      setTimeout(function () {
        doSwap();
        requestAnimationFrame(function () {
          document.body.classList.remove("lang-swapping");
        });
      }, 200);
    } else {
      doSwap();
    }
  }

  function initLang() {
    var saved = "ru";
    try { saved = localStorage.getItem("at-lang") || "ru"; } catch (e) {}
    $all(".lang button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLang(btn.getAttribute("data-lang"), true);
      });
    });
    if (saved !== "ru") applyLang(saved, false);
    else applyLang("ru", false);
  }

  /* ---------- Header / scroll progress / backtop ---------- */
  function initScroll() {
    var header = $(".site-header");
    var progress = $(".scroll-progress");
    var backtop = $(".backtop");

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var p = docH > 0 ? y / docH : 0;
      if (progress) progress.style.setProperty("--progress", p.toFixed(4));
      if (header) header.classList.toggle("scrolled", y > 24);
      if (backtop) backtop.classList.toggle("show", y > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (backtop) {
      backtop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    var burger = $(".burger");
    var menu = $("#mobileMenu");
    if (!burger || !menu) return;

    function setOpen(open) {
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      menu.setAttribute("aria-hidden", open ? "false" : "true");
    }
    burger.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("menu-open"));
    });
    $all("a", menu).forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) setOpen(false);
    });
    // close if resized to desktop
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (m) {
      if (m.matches) setOpen(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var items = $all("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Stat counters ---------- */
  function animateCount(el) {
    if (el.dataset.counted === "1") return;
    var text = el.dataset.final || el.textContent;
    var m = text.match(/[\d٠-٩][\d.,٠-٩]*/); // first numeric group (incl. Arabic-Indic)
    if (!m) { el.dataset.counted = "1"; return; }
    var raw = m[0];
    var prefix = text.slice(0, m.index);
    var suffix = text.slice(m.index + raw.length);

    // normalise Arabic-Indic digits for parsing
    var ascii = raw.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
    var decSep = ascii.indexOf(",") > -1 ? "," : (ascii.indexOf(".") > -1 ? "." : "");
    var target = parseFloat(ascii.replace(",", "."));
    if (isNaN(target)) { el.dataset.counted = "1"; return; }
    var decimals = decSep ? (ascii.split(decSep)[1] || "").length : 0;
    var arabicDigits = /[٠-٩]/.test(raw);

    el.dataset.counted = "1";
    var dur = 1300, start = null;
    function toArabic(s) {
      return s.replace(/[0-9]/g, function (d) { return String.fromCharCode(0x0660 + parseInt(d, 10)); });
    }
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = target * eased;
      var out = decimals ? val.toFixed(decimals) : Math.round(val).toString();
      if (decSep === ",") out = out.replace(".", ",");
      if (arabicDigits) out = toArabic(out);
      el.textContent = prefix + out + suffix;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = el.dataset.final || text; // exact final
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    var stats = $all("[data-count]");
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    stats.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Active nav link ---------- */
  function initActiveNav() {
    var links = $all(".nav-desktop a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var sections = $all("main section[id]");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.remove("active"); });
          var id = e.target.id;
          if (map[id]) map[id].classList.add("active");
        }
      });
    }, { threshold: 0.5, rootMargin: "-20% 0px -40% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Hero pointer glow + parallax ---------- */
  function initHero() {
    var hero = $(".hero");
    var glow = $(".hero-bg .pointer-glow");
    var grid = $(".hero-bg .grid-lines");
    if (!hero) return;
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && glow) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        glow.style.setProperty("--mx", (e.clientX - r.left) + "px");
        glow.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    }
    if (grid && !reduceMotion) {
      window.addEventListener("scroll", function () {
        var y = window.scrollY || 0;
        if (y < window.innerHeight) grid.style.transform = "translateY(" + (y * 0.12) + "px)";
      }, { passive: true });
    }
  }

  /* ---------- Contact form → mailto ---------- */
  function initForm() {
    var form = $(".lead-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var company = (data.get("company") || "").toString().trim();
      var contact = (data.get("contact") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var dict = I18N[currentLang] || I18N.ru;
      var subjectBase = (dict && dict.contactEyebrow) ? dict.contactEyebrow : "Partnership";
      var subject = subjectBase + (name ? " — " + name : "") + (company ? ", " + company : "");
      var body =
        message + "\n\n" +
        "—\n" +
        name + (company ? " · " + company : "") + "\n" +
        contact;

      var href = "mailto:a.taskaev@tsr-gr.ru?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

      var btn = $("button[type=submit]", form);
      var label = btn ? $(".btn-label", btn) : null;
      var prev = label ? label.textContent : "";
      if (btn) btn.classList.add("sent");
      if (label) label.textContent = "✓";
      window.location.href = href;
      setTimeout(function () {
        if (btn) btn.classList.remove("sent");
        if (label) label.textContent = prev;
      }, 2600);
    });
  }

  /* ---------- init ---------- */
  function init() {
    initLang();
    initScroll();
    initMenu();
    initReveal();
    initCounters();
    initActiveNav();
    initHero();
    initForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
